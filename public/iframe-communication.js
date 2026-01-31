/**
 * Parent iframe communication module
 * Handles drag and drop coordination between multiple iframes
 */

export class IframeCommunicationManager {
  constructor() {
    this.isDragging = false;
    this.dragData = null;
    this.dragPreview = null;
    this.frameA = null;
    this.frameB = null;
    this.clipboardData = null;
  }

  /**
   * Initialize the manager with iframe elements
   * @param {HTMLIFrameElement} frameA - First iframe element
   * @param {HTMLIFrameElement} frameB - Second iframe element
   */
  initialize(frameA, frameB) {
    this.frameA = frameA;
    this.frameB = frameB;

    // Listen for messages from frames
    window.addEventListener('message', (event) => this.handleMessage(event));

    // Set up pointer event listeners on the parent
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
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
    const isFromFrameA = event.source === this.frameA?.contentWindow;
    const isFromFrameB = event.source === this.frameB?.contentWindow;
    const isSameOrigin = event.origin === window.location.origin;
    
    if ((!isFromFrameA && !isFromFrameB) || !isSameOrigin) {
      // Ignore messages from unknown sources or different origins
      return;
    }

    const { type, data } = event.data;

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
        this.handleDropSuccess(event.data.dragData, isFromFrameA ? 'frame-a' : 'frame-b');
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
        if (this.clipboardData && this.clipboardData.source === 'frame-a') {
          this.frameA.contentWindow.postMessage({
            type: 'removeItem',
            id: this.clipboardData.id
          }, window.location.origin);
          this.clipboardData = null;
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
    const sourceFrame = data.source === 'frame-a' ? this.frameA : this.frameB;
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
    const sourceFrame = data.source === 'frame-a' ? this.frameA : this.frameB;
    const frameRect = sourceFrame.getBoundingClientRect();
    
    const parentX = frameRect.left + data.clientX;
    const parentY = frameRect.top + data.clientY;

    // Hide preview to check element under pointer
    this.dragPreview.style.display = 'none';
    const elementUnder = document.elementFromPoint(parentX, parentY);
    this.dragPreview.style.display = '';

    // Check if we're over each frame using the helper function
    const overFrameA = this.isOverFrame(elementUnder, this.frameA, parentX, parentY);
    const overFrameB = this.isOverFrame(elementUnder, this.frameB, parentX, parentY);

    // Check if we're dropping on frame-a
    if (overFrameA && this.dragData.source !== 'frame-a' && this.dragData.source !== 'frame-a-table') {
      const frameARect = this.frameA.getBoundingClientRect();
      const relativeX = parentX - frameARect.left;
      const relativeY = parentY - frameARect.top;

      try {
        this.frameA.contentWindow.postMessage({
          type: 'parentDrop',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
        
        // Remove item from source frame (Frame B) - but not for table demo (copy semantics)
        if (this.dragData.source === 'frame-b') {
          this.frameB.contentWindow.postMessage({
            type: 'removeItem',
            id: this.dragData.id
          }, window.location.origin);
        }
      } catch (err) {
        console.error('Failed to send drop message to frame-a:', err);
      }
    }
    // Check if we're dropping on frame-b
    else if (overFrameB) {
      const frameBRect = this.frameB.getBoundingClientRect();
      const relativeX = parentX - frameBRect.left;
      const relativeY = parentY - frameBRect.top;

      try {
        this.frameB.contentWindow.postMessage({
          type: 'parentDrop',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
      } catch (err) {
        console.error('Failed to send drop message to frame-b:', err);
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
    // Determine which frame we're over using the helper function
    const overFrameA = this.isOverFrame(elementUnder, this.frameA, clientX, clientY);
    const overFrameB = this.isOverFrame(elementUnder, this.frameB, clientX, clientY);

    // Handle Frame A
    if (overFrameA && this.dragData.source !== 'frame-a' && this.dragData.source !== 'frame-a-table') {
      // Dragging from Frame B to Frame A
      const frameARect = this.frameA.getBoundingClientRect();
      const relativeX = clientX - frameARect.left;
      const relativeY = clientY - frameARect.top;

      try {
        this.frameA.contentWindow.postMessage({
          type: 'parentDragMove',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
      } catch (err) {
        console.error('Failed to send message to frame-a:', err);
      }

      // Send drag leave to Frame B
      try {
        this.frameB.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
      } catch (err) {
        // Ignore
      }
    } 
    // Handle Frame B
    else if (overFrameB) {
      // Dragging to Frame B (from either frame)
      const frameBRect = this.frameB.getBoundingClientRect();
      const relativeX = clientX - frameBRect.left;
      const relativeY = clientY - frameBRect.top;

      try {
        this.frameB.contentWindow.postMessage({
          type: 'parentDragMove',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
      } catch (err) {
        console.error('Failed to send message to frame-b:', err);
      }

      // Send drag leave to Frame A if dragging from B or B-table
      if (this.dragData.source === 'frame-b' || this.dragData.source === 'frame-b-table') {
        try {
          this.frameA.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
        } catch (err) {
          // Ignore
        }
      }
    } 
    // Not over any frame
    else {
      // Send drag leave to both frames
      try {
        this.frameA.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
        this.frameB.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
      } catch (err) {
        // Ignore
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

    // Check if we're over each frame using the helper function
    const overFrameA = this.isOverFrame(elementUnder, this.frameA, e.clientX, e.clientY);
    const overFrameB = this.isOverFrame(elementUnder, this.frameB, e.clientX, e.clientY);

    // Check if we're dropping on frame-a
    if (overFrameA && this.dragData.source !== 'frame-a' && this.dragData.source !== 'frame-a-table') {
      const frameARect = this.frameA.getBoundingClientRect();
      const relativeX = e.clientX - frameARect.left;
      const relativeY = e.clientY - frameARect.top;

      try {
        this.frameA.contentWindow.postMessage({
          type: 'parentDrop',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);

        // Remove item from source frame (Frame B) - but not for table demo (copy semantics)
        if (this.dragData.source === 'frame-b') {
          this.frameB.contentWindow.postMessage({
            type: 'removeItem',
            id: this.dragData.id
          }, window.location.origin);
        }
      } catch (err) {
        console.error('Failed to send drop message to frame-a:', err);
      }
    }
    // Check if we're dropping on frame-b
    else if (overFrameB) {
      const frameBRect = this.frameB.getBoundingClientRect();
      const relativeX = e.clientX - frameBRect.left;
      const relativeY = e.clientY - frameBRect.top;

      try {
        this.frameB.contentWindow.postMessage({
          type: 'parentDrop',
          x: relativeX,
          y: relativeY,
          dragData: this.dragData
        }, window.location.origin);
      } catch (err) {
        console.error('Failed to send drop message to frame-b:', err);
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

    // Send drag leave to both frames to clear any hover states
    try {
      if (this.frameA && this.frameA.contentWindow) {
        this.frameA.contentWindow.postMessage({
          type: 'parentDragLeave'
        }, window.location.origin);
      }
      if (this.frameB && this.frameB.contentWindow) {
        this.frameB.contentWindow.postMessage({
          type: 'parentDragLeave'
        }, window.location.origin);
      }
    } catch (err) {
      // Ignore
    }
  }
  
  handleDropSuccess(dragData, targetFrame) {
    // Only remove item from source if this is a cross-frame drop
    if (dragData.source !== targetFrame) {
      if (dragData.source === 'frame-a') {
        this.frameA.contentWindow.postMessage({
          type: 'removeItem',
          id: dragData.id
        }, window.location.origin);
      } else if (dragData.source === 'frame-b') {
        this.frameB.contentWindow.postMessage({
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
    // Relay copied row data to both frames so they can paste
    console.log('Parent relaying rowCopied:', data.rowData?.description);
    try {
      if (this.frameA && this.frameA.contentWindow) {
        this.frameA.contentWindow.postMessage({
          type: 'rowCopied',
          rowData: data.rowData
        }, window.location.origin);
        console.log('Sent rowCopied to Frame A');
      } else {
        console.warn('Frame A not ready for postMessage');
      }
      if (this.frameB && this.frameB.contentWindow) {
        this.frameB.contentWindow.postMessage({
          type: 'rowCopied',
          rowData: data.rowData
        }, window.location.origin);
        console.log('Sent rowCopied to Frame B');
      } else {
        console.warn('Frame B not ready for postMessage');
      }
    } catch (err) {
      console.error('Failed to relay copied row data:', err);
    }
  }

  handlePasteRequest(target) {
    if (!this.clipboardData) return;
    
    const targetFrame = target === 'frame-a' ? this.frameA : this.frameB;
    
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
