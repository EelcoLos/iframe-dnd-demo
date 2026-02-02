/**
 * Parent iframe communication module
 * Handles drag and drop coordination between multiple iframes
 */

export class IframeCommunicationManager {
  constructor() {
    this.isDragging = false;
    this.dragData = null;
    this.dragPreview = null;
    this.frames = new Map(); // Map of frameId -> iframe element
    this.clipboardData = null;
  }

  /**
   * Initialize the manager with iframe elements
   * @param {Array<{id: string, element: HTMLIFrameElement}>} frames - Array of frame configurations
   * @example
   * manager.initialize([
   *   { id: 'source-frame', element: document.getElementById('frame-a') },
   *   { id: 'target-frame', element: document.getElementById('frame-b') }
   * ]);
   */
  initialize(frames) {
    // Store frames in a map for easy lookup
    frames.forEach(({ id, element }) => {
      this.frames.set(id, element);
    });

    // Listen for messages from frames
    window.addEventListener('message', (event) => this.handleMessage(event));

    // Set up pointer event listeners on the parent
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  /**
   * Get frame element by ID
   * @param {string} frameId - The frame identifier
   * @returns {HTMLIFrameElement|null}
   */
  getFrame(frameId) {
    return this.frames.get(frameId) || null;
  }

  /**
   * Get frame ID by element
   * @param {HTMLIFrameElement} element - The iframe element
   * @returns {string|null}
   */
  getFrameId(element) {
    for (const [id, iframe] of this.frames.entries()) {
      if (iframe === element) return id;
    }
    return null;
  }

  /**
   * Check if a pointer position is over a specific iframe
   * Uses both elementFromPoint and coordinate bounds for reliable detection
   */
  isOverFrame(elementUnder, frameElement, clientX, clientY) {
    if (!frameElement) return false;
    
    // Direct element match
    if (elementUnder === frameElement) return true;
    
    // Coordinate-based fallback for Firefox and other browsers
    // where elementFromPoint might not return the iframe element
    const rect = frameElement.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && 
           clientY >= rect.top && clientY <= rect.bottom;
  }

  /**
   * Handle messages from iframes
   */
  handleMessage(event) {
    // Validate that the message is from one of our iframes
    const isSameOrigin = event.origin === window.location.origin;
    
    // Find which frame sent this message
    let sourceFrameId = null;
    for (const [id, iframe] of this.frames.entries()) {
      if (event.source === iframe?.contentWindow) {
        sourceFrameId = id;
        break;
      }
    }
    
    if (!sourceFrameId || !isSameOrigin) {
      // Ignore messages from unknown sources or different origins
      return;
    }

    switch (event.data.type) {
      case 'dragStart':
        this.startDrag(event.data);
        break;
      case 'dragEnd':
        this.handleIframeDragEnd(event.data);
        break;
      case 'dragMove':
        this.handleIframeDragMove(event.data);
        break;
      case 'dropSuccess':
        this.handleDropSuccess(event.data.dragData, sourceFrameId);
        break;
      case 'dropFailed':
        this.handleDropFailed(event.data.dragData);
        break;
      case 'rowCopied':
        this.handleRowCopied(event.data);
        break;
      case 'itemCopied':
        this.clipboardData = event.data.itemData;
        break;
      case 'requestPaste':
        this.handlePasteRequest(event.data.target);
        break;
      case 'pasteSuccess':
        if (this.clipboardData && this.clipboardData.source) {
          const sourceFrame = this.getFrame(this.clipboardData.source);
          if (sourceFrame) {
            sourceFrame.contentWindow.postMessage({
              type: 'removeItem',
              id: this.clipboardData.id
            }, window.location.origin);
            this.clipboardData = null;
          }
        }
        break;
    }
  }

  startDrag(data) {
    this.isDragging = true;
    this.dragData = data;

    // Create drag preview
    this.dragPreview = document.createElement('div');
    this.dragPreview.className = 'drag-preview';
    this.dragPreview.textContent = data.text;
    document.body.appendChild(this.dragPreview);
  }

  handleIframeDragMove(data) {
    if (!this.isDragging || !this.dragPreview) return;

    // The iframe sends us coordinates relative to its own viewport
    // We need to convert them to parent coordinates
    const sourceFrame = this.getFrame(data.source);
    if (!sourceFrame) return;
    
    const frameRect = sourceFrame.getBoundingClientRect();
    
    const parentX = frameRect.left + data.clientX;
    const parentY = frameRect.top + data.clientY;

    // Update drag preview position
    this.dragPreview.style.left = parentX + 'px';
    this.dragPreview.style.top = parentY + 'px';

    // Check which frame we're over
    this.dragPreview.style.display = 'none';
    const elementUnder = document.elementFromPoint(parentX, parentY);
    this.dragPreview.style.display = '';

    this.updateFrameHover(elementUnder, parentX, parentY);
  }

  handleIframeDragEnd(data) {
    if (!this.isDragging || !this.dragPreview) return;

    // The iframe sends us where the pointer was released
    // Convert to parent coordinates
    const sourceFrame = this.getFrame(data.source);
    if (!sourceFrame) return;
    
    const frameRect = sourceFrame.getBoundingClientRect();
    
    const parentX = frameRect.left + data.clientX;
    const parentY = frameRect.top + data.clientY;

    // Hide preview to check element under pointer
    this.dragPreview.style.display = 'none';
    const elementUnder = document.elementFromPoint(parentX, parentY);
    this.dragPreview.style.display = '';

    // Check which frame we're over and handle drop
    for (const [targetFrameId, targetFrame] of this.frames.entries()) {
      const isOverFrame = this.isOverFrame(elementUnder, targetFrame, parentX, parentY);
      
      if (isOverFrame && this.dragData.source !== targetFrameId) {
        const targetRect = targetFrame.getBoundingClientRect();
        const relativeX = parentX - targetRect.left;
        const relativeY = parentY - targetRect.top;

        try {
          targetFrame.contentWindow.postMessage({
            type: 'parentDrop',
            x: relativeX,
            y: relativeY,
            dragData: this.dragData
          }, window.location.origin);
          
          // Remove item from source frame if it's a move operation (not copy)
          // Table demos use copy semantics (source ends with '-table')
          if (!this.dragData.source.endsWith('-table')) {
            const sourceFrameElement = this.getFrame(this.dragData.source);
            if (sourceFrameElement) {
              sourceFrameElement.contentWindow.postMessage({
                type: 'removeItem',
                id: this.dragData.id
              }, window.location.origin);
            }
          }
        } catch (err) {
          console.error(`Failed to send drop message to ${targetFrameId}:`, err);
        }
        break; // Only drop on one frame
      }
    }

    this.endDrag();
  }

  handlePointerMove(e) {
    if (!this.isDragging || !this.dragPreview) return;

    // Update drag preview position
    this.dragPreview.style.left = e.clientX + 'px';
    this.dragPreview.style.top = e.clientY + 'px';

    // Temporarily hide the preview to use elementFromPoint
    this.dragPreview.style.display = 'none';
    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
    this.dragPreview.style.display = '';

    this.updateFrameHover(elementUnder, e.clientX, e.clientY);
  }

  updateFrameHover(elementUnder, clientX, clientY) {
    // Find which frame we're over
    let hoveredFrameId = null;
    let hoveredFrame = null;
    
    for (const [frameId, frame] of this.frames.entries()) {
      if (this.isOverFrame(elementUnder, frame, clientX, clientY)) {
        hoveredFrameId = frameId;
        hoveredFrame = frame;
        break;
      }
    }

    // Send drag move to hovered frame if it's not the source
    if (hoveredFrame && this.dragData.source !== hoveredFrameId) {
      const frameRect = hoveredFrame.getBoundingClientRect();
      const relativeX = clientX - frameRect.left;
      const relativeY = clientY - frameRect.top;

      try {
        hoveredFrame.contentWindow.postMessage({
          type: 'parentDragMove',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
      } catch (err) {
        console.error(`Failed to send message to ${hoveredFrameId}:`, err);
      }

      // Send drag leave to all other frames
      for (const [frameId, frame] of this.frames.entries()) {
        if (frameId !== hoveredFrameId) {
          try {
            frame.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
          } catch (err) {
            // Ignore
          }
        }
      }
    } else {
      // Not over any droppable frame - send drag leave to all frames
      for (const [frameId, frame] of this.frames.entries()) {
        try {
          frame.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  handlePointerUp(e) {
    if (!this.isDragging) return;

    // Hide preview to check element under pointer
    if (this.dragPreview) {
      this.dragPreview.style.display = 'none';
    }
    
    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);

    // Check which frame we're over and handle drop
    for (const [targetFrameId, targetFrame] of this.frames.entries()) {
      const isOverFrame = this.isOverFrame(elementUnder, targetFrame, e.clientX, e.clientY);
      
      if (isOverFrame && this.dragData.source !== targetFrameId) {
        const targetRect = targetFrame.getBoundingClientRect();
        const relativeX = e.clientX - targetRect.left;
        const relativeY = e.clientY - targetRect.top;

        try {
          targetFrame.contentWindow.postMessage({
            type: 'parentDrop',
            x: relativeX,
            y: relativeY,
            dragData: this.dragData
          }, window.location.origin);

          // Remove item from source frame if it's a move operation (not copy)
          if (!this.dragData.source.endsWith('-table')) {
            const sourceFrame = this.getFrame(this.dragData.source);
            if (sourceFrame) {
              sourceFrame.contentWindow.postMessage({
                type: 'removeItem',
                id: this.dragData.id
              }, window.location.origin);
            }
          }
        } catch (err) {
          console.error(`Failed to send drop message to ${targetFrameId}:`, err);
        }
        break; // Only drop on one frame
      }
    }

    this.endDrag();
  }

  endDrag() {
    this.isDragging = false;
    this.dragData = null;

    if (this.dragPreview) {
      this.dragPreview.remove();
      this.dragPreview = null;
    }

    // Send drag leave to all frames to clear any hover states
    for (const [frameId, frame] of this.frames.entries()) {
      try {
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            type: 'parentDragLeave'
          }, window.location.origin);
        }
      } catch (err) {
        // Ignore
      }
    }
  }
  
  handleDropSuccess(dragData, targetFrameId) {
    // Only remove item from source if this is a cross-frame drop
    if (dragData.source !== targetFrameId) {
      const sourceFrame = this.getFrame(dragData.source);
      if (sourceFrame) {
        sourceFrame.contentWindow.postMessage({
          type: 'removeItem',
          id: dragData.id
        }, window.location.origin);
      }
    }
  }
  
  handleDropFailed(dragData) {
    // Do nothing - item stays in source frame
    console.log('Drop failed - item will remain in source frame');
  }

  handleRowCopied(data) {
    // Relay copied row data to all frames so they can paste
    console.log('Parent relaying rowCopied:', data.rowData?.description);
    for (const [frameId, frame] of this.frames.entries()) {
      try {
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            type: 'rowCopied',
            rowData: data.rowData
          }, window.location.origin);
          console.log(`Sent rowCopied to ${frameId}`);
        } else {
          console.warn(`${frameId} not ready for postMessage`);
        }
      } catch (err) {
        console.error(`Failed to relay copied row data to ${frameId}:`, err);
      }
    }
  }

  handlePasteRequest(targetFrameId) {
    if (!this.clipboardData) return;
    
    const targetFrame = this.getFrame(targetFrameId);
    
    try {
      targetFrame.contentWindow.postMessage({
        type: 'pasteItem',
        itemData: this.clipboardData
      }, window.location.origin);
    } catch (err) {
      console.error('Failed to send paste message:', err);
    }
  }
}
