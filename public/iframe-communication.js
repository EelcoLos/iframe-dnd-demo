/**
 * @fileoverview Parent iframe communication module for coordinating drag and drop between multiple iframes.
 * 
 * @module iframe-communication
 * @description
 * This module provides the `IframeCommunicationManager` class which acts as a central coordinator
 * for cross-iframe drag and drop operations. It manages communication between parent and child iframes,
 * handles pointer events, and coordinates drag preview rendering.
 * 
 * @example
 * // Initialize the manager with multiple frames
 * import { IframeCommunicationManager } from './iframe-communication.js';
 * 
 * const manager = new IframeCommunicationManager();
 * manager.initialize([
 *   { id: 'source-panel', element: document.getElementById('frame-a') },
 *   { id: 'target-panel', element: document.getElementById('frame-b') }
 * ]);
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * @typedef {Object} FrameConfig
 * @property {string} id - Unique identifier for the frame
 * @property {HTMLIFrameElement} element - The iframe DOM element
 */

/**
 * @typedef {Object} DragData
 * @property {string} text - The text content being dragged
 * @property {string} id - Unique identifier for the dragged item
 * @property {string} source - The frame ID where the drag originated
 * @property {number} [pointerId] - The pointer ID for the drag event
 */

/**
 * Central manager for coordinating drag and drop operations between multiple iframes.
 * 
 * @class IframeCommunicationManager
 * @description
 * Manages cross-iframe drag and drop by:
 * - Tracking registered iframes via a Map
 * - Coordinating pointer events across parent and child windows
 * - Managing drag preview rendering
 * - Routing messages between frames
 * - Handling clipboard operations
 * 
 * @example
 * const manager = new IframeCommunicationManager();
 * manager.initialize([
 *   { id: 'editor', element: document.getElementById('editor-frame') },
 *   { id: 'preview', element: document.getElementById('preview-frame') }
 * ]);
 */
export class IframeCommunicationManager {
  /**
   * Creates a new IframeCommunicationManager instance.
   * 
   * @constructor
   * @description
   * Initializes the manager with empty state. Call `initialize()` to register frames
   * and set up event listeners.
   */
  constructor() {
    /**
     * Whether a drag operation is currently in progress
     * @type {boolean}
     * @private
     */
    this.isDragging = false;
    
    /**
     * Data about the current drag operation
     * @type {DragData|null}
     * @private
     */
    this.dragData = null;
    
    /**
     * The DOM element used as a drag preview
     * @type {HTMLDivElement|null}
     * @private
     */
    this.dragPreview = null;
    
    /**
     * Map of frame IDs to iframe elements
     * @type {Map<string, HTMLIFrameElement>}
     * @private
     */
    this.frames = new Map();
    
    /**
     * Data stored in clipboard for copy/paste operations
     * @type {Object|null}
     * @private
     */
    this.clipboardData = null;
  }

  /**
   * Initialize the manager with iframe elements and set up event listeners.
   * 
   * @param {FrameConfig[]} frames - Array of frame configurations
   * @throws {TypeError} If frames is not an array or contains invalid configurations
   * 
   * @example
   * manager.initialize([
   *   { id: 'source-frame', element: document.getElementById('frame-a') },
   *   { id: 'target-frame', element: document.getElementById('frame-b') }
   * ]);
   * 
   * @example
   * // With three frames for a more complex layout
   * manager.initialize([
   *   { id: 'sidebar', element: document.getElementById('sidebar-frame') },
   *   { id: 'main', element: document.getElementById('main-frame') },
   *   { id: 'preview', element: document.getElementById('preview-frame') }
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
   * Get frame element by ID.
   * 
   * @param {string} frameId - The frame identifier
   * @returns {HTMLIFrameElement|null} The iframe element or null if not found
   * 
   * @example
   * const frame = manager.getFrame('source-panel');
   * if (frame) {
   *   console.log('Frame found:', frame.src);
   * }
   */
  getFrame(frameId) {
    return this.frames.get(frameId) || null;
  }

  /**
   * Get frame ID by element.
   * 
   * @param {HTMLIFrameElement} element - The iframe element
   * @returns {string|null} The frame ID or null if not found
   * 
   * @example
   * const frameId = manager.getFrameId(document.getElementById('my-frame'));
   * console.log('Frame ID:', frameId);
   */
  getFrameId(element) {
    for (const [id, iframe] of this.frames.entries()) {
      if (iframe === element) return id;
    }
    return null;
  }

  /**
   * Check if a pointer position is over a specific iframe.
   * 
   * @param {Element|null} elementUnder - The element returned by elementFromPoint
   * @param {HTMLIFrameElement} frameElement - The iframe to check against
   * @param {number} clientX - X coordinate of the pointer
   * @param {number} clientY - Y coordinate of the pointer
   * @returns {boolean} True if the pointer is over the iframe
   * 
   * @description
   * Uses both elementFromPoint and coordinate bounds for reliable detection.
   * This dual approach handles browser inconsistencies, particularly in Firefox.
   * 
   * @example
   * const isOver = manager.isOverFrame(
   *   document.elementFromPoint(100, 200),
   *   frameElement,
   *   100,
   *   200
   * );
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
   * Handle messages from iframes.
   * 
   * @param {MessageEvent} event - The message event from postMessage
   * @private
   * 
   * @description
   * Processes messages from child iframes and routes them to appropriate handlers.
   * Validates message origin and source before processing.
   * 
   * Supported message types:
   * - dragStart: Initiate a drag operation
   * - dragEnd: Complete a drag operation
   * - dragMove: Update drag position
   * - dropSuccess: Item was successfully dropped
   * - dropFailed: Drop operation failed
   * - rowCopied: Row was copied (table demo)
   * - itemCopied: Item was copied to clipboard
   * - requestPaste: Request to paste clipboard data
   * - pasteSuccess: Paste operation succeeded
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

  /**
   * Start a drag operation.
   * 
   * @param {DragData} data - Data about the drag operation
   * @private
   * 
   * @description
   * Creates a visual drag preview element and sets the drag state.
   * The preview follows the cursor during the drag operation.
   */
  startDrag(data) {
    this.isDragging = true;
    this.dragData = data;

    // Create drag preview
    this.dragPreview = document.createElement('div');
    this.dragPreview.className = 'drag-preview';
    this.dragPreview.textContent = data.text;
    document.body.appendChild(this.dragPreview);
  }

  /**
   * Handle drag move events from iframes.
   * 
   * @param {Object} data - Drag move data from the iframe
   * @param {string} data.source - Source frame ID
   * @param {number} data.clientX - X coordinate relative to iframe
   * @param {number} data.clientY - Y coordinate relative to iframe
   * @private
   * 
   * @description
   * Converts iframe-relative coordinates to parent coordinates and updates
   * the drag preview position. Also determines which frame is being hovered
   * and notifies it.
   */
  handleIframeDragMove(data) {
    if (!this.isDragging || !this.dragPreview) return;

    // The iframe sends us coordinates relative to its own viewport
    // We need to convert them to parent coordinates
    // Normalize the source ID (e.g., 'frame-a-table' -> 'frame-a')
    const normalizedSourceId =
      typeof data.source === 'string'
        ? data.source.replace(/-table$/, '')
        : data.source;
    const sourceFrame = this.getFrame(normalizedSourceId);
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

  /**
   * Handle drag end events from iframes.
   * 
   * @param {Object} data - Drag end data from the iframe
   * @param {string} data.source - Source frame ID
   * @param {number} data.clientX - X coordinate relative to iframe where drag ended
   * @param {number} data.clientY - Y coordinate relative to iframe where drag ended
   * @private
   * 
   * @description
   * Determines the drop target and sends the appropriate messages to complete
   * the drag and drop operation. Handles both move and copy semantics.
   * Table frames (ending with '-table' suffix) use copy semantics by default.
   */
  handleIframeDragEnd(data) {
    if (!this.isDragging || !this.dragPreview) return;

    // The iframe sends us where the pointer was released
    // Convert to parent coordinates
    // Normalize the source ID (e.g., 'frame-a-table' -> 'frame-a')
    const normalizedSourceId =
      typeof data.source === 'string'
        ? data.source.replace(/-table$/, '')
        : data.source;
    const sourceFrame = this.getFrame(normalizedSourceId);
    if (!sourceFrame) return;
    
    const frameRect = sourceFrame.getBoundingClientRect();
    
    const parentX = frameRect.left + data.clientX;
    const parentY = frameRect.top + data.clientY;

    // Hide preview to check element under pointer
    this.dragPreview.style.display = 'none';
    const elementUnder = document.elementFromPoint(parentX, parentY);
    this.dragPreview.style.display = '';

    // Check which frame we're over and handle drop
    // Normalize the source frame ID (e.g., 'frame-a-table' -> 'frame-a') before comparison
    const normalizedDragSource =
      this.dragData && typeof this.dragData.source === 'string'
        ? this.dragData.source.replace(/-table$/, '')
        : this.dragData && this.dragData.source;
    
    for (const [targetFrameId, targetFrame] of this.frames.entries()) {
      const isOverFrame = this.isOverFrame(elementUnder, targetFrame, parentX, parentY);
      
      if (isOverFrame && normalizedDragSource !== targetFrameId) {
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
            const sourceFrameElement = this.getFrame(normalizedDragSource);
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

  /**
   * Handle pointer move events in the parent window.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Updates the drag preview position and determines which frame is being
   * hovered over during a drag operation.
   */
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

  /**
   * Update frame hover states during a drag operation.
   * 
   * @param {Element|null} elementUnder - Element under the pointer
   * @param {number} clientX - X coordinate of pointer
   * @param {number} clientY - Y coordinate of pointer
   * @private
   * 
   * @description
   * Sends parentDragMove messages to the hovered frame and parentDragLeave
   * messages to all other frames. This provides visual feedback during drag.
   */
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

    // Normalize the source frame ID (e.g., 'frame-a-table' -> 'frame-a') before comparison
    const sourceFrameId =
      this.dragData && typeof this.dragData.source === 'string'
        ? this.dragData.source.replace(/-table$/, '')
        : this.dragData && this.dragData.source;

    // Send drag move to hovered frame if it's not the source
    if (hoveredFrame && sourceFrameId !== hoveredFrameId) {
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
      for (const frame of this.frames.values()) {
        try {
          frame.contentWindow.postMessage({ type: 'parentDragLeave' }, window.location.origin);
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  /**
   * Handle pointer up events in the parent window.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Completes a drag operation initiated in the parent window.
   * Determines the drop target and sends appropriate drop messages.
   */
  handlePointerUp(e) {
    if (!this.isDragging) return;

    // Hide preview to check element under pointer
    if (this.dragPreview) {
      this.dragPreview.style.display = 'none';
    }
    
    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);

    // Check which frame we're over and handle drop
    // Normalize the source frame ID (e.g., 'frame-a-table' -> 'frame-a') before comparison
    const normalizedDragSource =
      this.dragData && typeof this.dragData.source === 'string'
        ? this.dragData.source.replace(/-table$/, '')
        : this.dragData && this.dragData.source;
    
    for (const [targetFrameId, targetFrame] of this.frames.entries()) {
      const isOverFrame = this.isOverFrame(elementUnder, targetFrame, e.clientX, e.clientY);
      
      if (isOverFrame && normalizedDragSource !== targetFrameId) {
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
            const sourceFrame = this.getFrame(normalizedDragSource);
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

  /**
   * End the current drag operation and clean up.
   * 
   * @private
   * 
   * @description
   * Removes the drag preview, resets state, and sends dragLeave messages
   * to all frames to clear hover states.
   */
  endDrag() {
    this.isDragging = false;
    this.dragData = null;

    if (this.dragPreview) {
      this.dragPreview.remove();
      this.dragPreview = null;
    }

    // Send drag leave to all frames to clear any hover states
    for (const frame of this.frames.values()) {
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
  
  /**
   * Handle successful drop operations.
   * 
   * @param {DragData} dragData - Data about the dropped item
   * @param {string} targetFrameId - ID of the frame where item was dropped
   * @private
   * 
   * @description
   * Removes the item from the source frame if it was a cross-frame drop.
   * Items dropped within the same frame are not removed.
   */
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
  
  /**
   * Handle failed drop operations.
   * 
   * @param {DragData} dragData - Data about the dropped item
   * @private
   * 
   * @description
   * Logs the failure. Item remains in the source frame.
   */
  handleDropFailed(dragData) {
    // Do nothing - item stays in source frame
    console.log('Drop failed - item will remain in source frame');
  }

  /**
   * Handle row copied events from table frames.
   * 
   * @param {Object} data - Row copy data
   * @param {Object} data.rowData - The copied row data
   * @private
   * 
   * @description
   * Relays the copied row data to all frames so they can handle paste operations.
   * This is specific to the table demo functionality.
   */
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

  /**
   * Handle paste requests from frames.
   * 
   * @param {string} targetFrameId - ID of the frame requesting paste
   * @private
   * 
   * @description
   * Sends the clipboard data to the requesting frame if available.
   * Used for keyboard-based copy/paste operations.
   */
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
