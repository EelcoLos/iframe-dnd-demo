/**
 * @fileoverview Draggable items communication module for child iframes.
 * 
 * @module draggable-items-communication
 * @description
 * This module provides the `DraggableItemsManager` class which manages draggable items
 * within a child iframe. It handles pointer events for dragging, keyboard navigation,
 * and communication with the parent window for cross-iframe drag and drop operations.
 * 
 * @example
 * // Standard usage with drag capability
 * import { DraggableItemsManager } from './draggable-items-communication.js';
 * 
 * const manager = new DraggableItemsManager({ frameId: 'source-panel' });
 * manager.initialize();
 * 
 * @example
 * // Receive-only mode (can only accept drops, cannot drag)
 * const manager = new DraggableItemsManager({
 *   frameId: 'preview-panel',
 *   receiveOnly: true
 * });
 * manager.initialize();
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * @typedef {Object} DraggableItemOptions
 * @property {string} frameId - Unique identifier for this frame
 * @property {boolean} [receiveOnly=false] - If true, frame can only receive drops, not send drags
 */

/**
 * @typedef {Object} ItemData
 * @property {string} id - Unique identifier for the item
 * @property {string} text - Display text for the item
 * @property {string} source - Frame ID where the item originated
 */

/**
 * Manager for draggable items in child iframes.
 * 
 * @class DraggableItemsManager
 * @description
 * Manages draggable items by:
 * - Setting up pointer event handlers for drag operations
 * - Communicating drag events to the parent window
 * - Receiving drop and paste events from parent
 * - Supporting keyboard-based copy/paste operations
 * - Optional receive-only mode for non-draggable frames
 * 
 * @example
 * // Create a draggable items manager
 * const manager = new DraggableItemsManager({ frameId: 'items-panel' });
 * manager.initialize();
 * 
 * @example
 * // Create a receive-only manager (items cannot be dragged out)
 * const manager = new DraggableItemsManager({
 *   frameId: 'preview-panel',
 *   receiveOnly: true
 * });
 * manager.initialize();
 */
export class DraggableItemsManager {
  /**
   * Create a draggable items manager.
   * 
   * @constructor
   * @param {DraggableItemOptions|string} options - Configuration options or frame ID string
   * @throws {Error} If frameId is not provided
   * 
   * @description
   * Supports both object-based and string-based constructor arguments for
   * backward compatibility. When receiveOnly is true, drag handlers are not
   * set up, and items can only be received via drop or paste operations.
   * 
   * @example
   * // Object-based (recommended)
   * const manager = new DraggableItemsManager({
   *   frameId: 'panel-1',
   *   receiveOnly: false
   * });
   * 
   * @example
   * // String-based (backward compatible)
   * const manager = new DraggableItemsManager('panel-1');
   */
  constructor(options = {}) {
    const { frameId, receiveOnly = false } = typeof options === 'string' 
      ? { frameId: options, receiveOnly: false } 
      : options;
      
    if (!frameId) {
      throw new Error('frameId is required');
    }
    
    /**
     * Unique identifier for this frame
     * @type {string}
     * @public
     */
    this.frameId = frameId;
    
    /**
     * Whether this frame is receive-only (cannot send drags)
     * @type {boolean}
     * @public
     */
    this.receiveOnly = receiveOnly;
    
    /**
     * Currently dragged element
     * @type {HTMLElement|null}
     * @private
     */
    this.currentDragElement = null;
    
    /**
     * X coordinate where drag started
     * @type {number}
     * @private
     */
    this.dragStartX = 0;
    
    /**
     * Y coordinate where drag started
     * @type {number}
     * @private
     */
    this.dragStartY = 0;
    
    /**
     * Whether a drag is currently in progress
     * @type {boolean}
     * @private
     */
    this.isDragging = false;
    
    /**
     * Currently selected item for keyboard operations
     * @type {HTMLElement|null}
     * @private
     */
    this.selectedItem = null;
    
    /**
     * Data copied to clipboard via keyboard
     * @type {ItemData|null}
     * @private
     */
    this.copiedItemData = null;
    
    /**
     * Container currently being hovered during external drag
     * @type {HTMLElement|null}
     * @private
     */
    this.currentHoverContainer = null;
  }

  /**
   * Initialize the manager with draggable items.
   * 
   * @description
   * Sets up event handlers based on the receiveOnly flag:
   * - If receiveOnly is false: Sets up drag handlers and keyboard handlers
   * - If receiveOnly is true: Only sets up message listener for receiving drops
   * - Always sets up message listener and drop-in animations
   */
  initialize() {
    if (!this.receiveOnly) {
      this.setupDraggables();
      this.setupKeyboardHandlers();
    }
    this.setupMessageListener();
    this.addDropInAnimation();
  }

  /**
   * Set up draggable items.
   * 
   * @private
   * 
   * @description
   * Attaches pointerdown event listeners to all elements with the 'draggable' class.
   * Called during initialization unless receiveOnly mode is enabled.
   */
  setupDraggables() {
    document.querySelectorAll('.draggable').forEach(item => {
      item.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    });
  }

  /**
   * Handle pointer down events on draggable items.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Initiates a potential drag operation. Captures the pointer and sets up
   * move/up listeners. Drag doesn't actually start until the pointer moves
   * beyond a 5px threshold.
   */
  handlePointerDown(e) {
    e.preventDefault();
    
    this.currentDragElement = e.currentTarget;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.isDragging = false;

    // Capture the pointer to ensure we receive all events even if pointer moves fast
    this.currentDragElement.setPointerCapture(e.pointerId);

    // Set up move and up listeners
    const moveHandler = (e) => this.handlePointerMove(e);
    const upHandler = (e) => this.handlePointerUp(e);
    
    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    
    // Store handlers for cleanup
    this._moveHandler = moveHandler;
    this._upHandler = upHandler;
  }

  /**
   * Handle pointer move events during a drag operation.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Tracks pointer movement and starts the drag operation when movement exceeds
   * a 5px threshold. Sends drag move messages to the parent window for cross-iframe
   * drag tracking.
   */
  handlePointerMove(e) {
    if (!this.currentDragElement) return;

    // Check if we've moved enough to start dragging (5px threshold)
    const deltaX = Math.abs(e.clientX - this.dragStartX);
    const deltaY = Math.abs(e.clientY - this.dragStartY);

    if (!this.isDragging && (deltaX > 5 || deltaY > 5)) {
      this.isDragging = true;
      this.currentDragElement.classList.add('dragging');

      // Notify parent that drag has started
      window.parent.postMessage({
        type: 'dragStart',
        pointerId: e.pointerId,
        text: this.currentDragElement.textContent.trim(),
        id: this.currentDragElement.dataset.id,
        source: this.frameId
      }, window.location.origin);
    }

    // Continue sending pointer move events to parent while dragging
    if (this.isDragging) {
      // clientX/clientY are already relative to the iframe viewport
      window.parent.postMessage({
        type: 'dragMove',
        clientX: e.clientX,
        clientY: e.clientY,
        source: this.frameId
      }, window.location.origin);
    }
  }

  /**
   * Handle pointer up events to complete a drag operation.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Releases pointer capture, cleans up event listeners, and notifies parent
   * of drag end. Removes visual feedback and resets state.
   */
  handlePointerUp(e) {
    if (!this.currentDragElement) return;

    // Release pointer capture
    if (this.currentDragElement.hasPointerCapture(e.pointerId)) {
      this.currentDragElement.releasePointerCapture(e.pointerId);
    }

    // Clean up
    document.removeEventListener('pointermove', this._moveHandler);
    document.removeEventListener('pointerup', this._upHandler);

    if (this.isDragging) {
      // Send pointer position to parent for drop detection
      // clientX/clientY are already relative to the iframe viewport
      window.parent.postMessage({
        type: 'dragEnd',
        clientX: e.clientX,
        clientY: e.clientY,
        source: this.frameId
      }, window.location.origin);
    }

    this.currentDragElement.classList.remove('dragging');
    this.currentDragElement = null;
    this.isDragging = false;
  }

  /**
   * Handle drag move events from parent window.
   * 
   * @param {number} x - X coordinate in this iframe's viewport
   * @param {number} y - Y coordinate in this iframe's viewport
   * @param {ItemData} dragData - Data about the dragged item
   * @private
   * 
   * @description
   * Called when an item from another frame is being dragged over this frame.
   * Provides visual feedback by adding a 'hover' class to the container.
   */
  onParentDragMove(x, y, dragData) {
    // Check if we're over the draggable items container
    const element = document.elementFromPoint(x, y);
    const container = element?.closest('.draggable-items');

    if (container && container !== this.currentHoverContainer) {
      // Clear previous hover
      if (this.currentHoverContainer) {
        this.currentHoverContainer.classList.remove('hover');
      }
      
      // Set new hover
      this.currentHoverContainer = container;
      this.currentHoverContainer.classList.add('hover');
    } else if (!container && this.currentHoverContainer) {
      // Clear hover if not over container
      this.currentHoverContainer.classList.remove('hover');
      this.currentHoverContainer = null;
    }
  }

  /**
   * Handle drop events from parent window.
   * 
   * @param {number} x - X coordinate where drop occurred
   * @param {number} y - Y coordinate where drop occurred
   * @param {ItemData} dragData - Data about the dropped item
   * @private
   * 
   * @description
   * Creates a new draggable item element when an item from another frame
   * is dropped onto this frame's container. Notifies parent of success or failure.
   * In receive-only mode, dropped items will not have drag handlers attached.
   */
  onParentDrop(x, y, dragData) {
    // Check if we're over the draggable items container
    const element = document.elementFromPoint(x, y);
    const container = element?.closest('.draggable-items');

    if (container && dragData.source !== this.frameId) {
      // Create a new draggable item
      const newItem = document.createElement('div');
      newItem.className = 'draggable';
      newItem.dataset.id = dragData.id || `dropped-${Date.now()}`;
      newItem.innerHTML = dragData.text;
      
      // Add to container
      container.appendChild(newItem);
      
      // Set up drag handlers for the new item (only if this frame is not receive-only)
      if (!this.receiveOnly) {
        newItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      }
      
      // Animate in
      newItem.style.animation = 'dropIn 0.3s ease';

      // Clear hover state
      container.classList.remove('hover');
      this.currentHoverContainer = null;
      
      // Notify parent that the drop was successful
      window.parent.postMessage({
        type: 'dropSuccess',
        dragData: dragData
      }, window.location.origin);
    } else if (dragData.source !== this.frameId) {
      // Notify parent that the drop failed
      window.parent.postMessage({
        type: 'dropFailed',
        dragData: dragData
      }, window.location.origin);
    }
  }

  /**
   * Set up message listener for parent window communication.
   * 
   * @private
   * 
   * @description
   * Listens for messages from the parent window and routes them to appropriate handlers.
   * Validates message origin for security before processing.
   * 
   * Supported message types:
   * - parentDragMove: Item is being dragged over this frame
   * - parentDrop: Item is being dropped onto this frame
   * - parentDragLeave: Drag has left this frame
   * - removeItem: Remove an item that was moved elsewhere
   * - pasteItem: Paste item from clipboard
   */
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Validate message origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'parentDragMove') {
        this.onParentDragMove(event.data.x, event.data.y, event.data.dragData);
      } else if (event.data.type === 'parentDrop') {
        this.onParentDrop(event.data.x, event.data.y, event.data.dragData);
      } else if (event.data.type === 'parentDragLeave') {
        if (this.currentHoverContainer) {
          this.currentHoverContainer.classList.remove('hover');
          this.currentHoverContainer = null;
        }
      } else if (event.data.type === 'removeItem') {
        // Remove item when it's successfully dropped elsewhere
        const itemToRemove = Array.from(document.querySelectorAll('[data-id]'))
          .find(item => item.dataset.id === event.data.id);
        if (itemToRemove) {
          itemToRemove.style.transition = 'all 0.2s ease';
          itemToRemove.style.opacity = '0';
          itemToRemove.style.transform = 'scale(0.8)';
          setTimeout(() => itemToRemove.remove(), 200);
        }
      } else if (event.data.type === 'pasteItem' && event.data.itemData) {
        this.handlePasteItem(event.data.itemData);
      }
    });
  }

  /**
   * Handle paste item operations.
   * 
   * @param {ItemData} itemData - Data about the item to paste
   * @private
   * 
   * @description
   * Creates a new item from clipboard data. In receive-only mode, the pasted
   * item will not have drag handlers attached. Notifies parent of successful paste.
   */
  handlePasteItem(itemData) {
    // Paste the item into this frame
    const container = document.querySelector('.draggable-items');
    if (container && itemData.source !== this.frameId) {
      const newItem = document.createElement('div');
      newItem.className = 'draggable';
      newItem.dataset.id = itemData.id || `pasted-${Date.now()}`;
      newItem.innerHTML = itemData.text;
      
      container.appendChild(newItem);
      // Set up drag handler for the new item (only if not receive-only)
      if (!this.receiveOnly) {
        newItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      }
      newItem.style.animation = 'dropIn 0.3s ease';
      
      // Select the newly pasted item
      if (this.selectedItem) {
        this.selectedItem.classList.remove('selected');
      }
      this.selectedItem = newItem;
      this.selectedItem.classList.add('selected');
    }
  }

  /**
   * Set up keyboard handlers for navigation and copy/paste operations.
   * 
   * @private
   * 
   * @description
   * Enables keyboard-based interactions:
   * - Arrow Up/Down: Navigate between draggable items
   * - Ctrl+C/Cmd+C: Copy selected item to clipboard
   * - Ctrl+V/Cmd+V: Paste item from clipboard (requests from parent)
   * 
   * Only active when receiveOnly is false.
   */
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      const draggableItems = Array.from(document.querySelectorAll('.draggable'));
      if (draggableItems.length === 0) return;

      // Arrow key navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (!this.selectedItem) {
          // Select first item
          this.selectedItem = draggableItems[0];
          this.selectedItem.classList.add('selected');
        } else {
          const currentIndex = draggableItems.indexOf(this.selectedItem);
          let newIndex;
          
          if (e.key === 'ArrowDown') {
            newIndex = (currentIndex + 1) % draggableItems.length;
          } else {
            newIndex = (currentIndex - 1 + draggableItems.length) % draggableItems.length;
          }
          
          this.selectedItem.classList.remove('selected');
          this.selectedItem = draggableItems[newIndex];
          this.selectedItem.classList.add('selected');
        }
      }
      // Copy functionality (Ctrl+C or Cmd+C)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.selectedItem) {
        e.preventDefault();
        
        this.copiedItemData = {
          text: this.selectedItem.textContent.trim(),
          id: this.selectedItem.dataset.id,
          source: this.frameId
        };
        
        // Notify parent that an item was copied
        window.parent.postMessage({
          type: 'itemCopied',
          itemData: this.copiedItemData
        }, window.location.origin);
        
        // Visual feedback
        const originalBg = this.selectedItem.style.background;
        this.selectedItem.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
        setTimeout(() => {
          this.selectedItem.style.background = originalBg;
        }, 200);
      }
      // Paste functionality (Ctrl+V or Cmd+V)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        // Request paste from parent
        window.parent.postMessage({
          type: 'requestPaste',
          target: this.frameId
        }, window.location.origin);
      }
    });
  }

  /**
   * Add CSS animation for dropped/pasted items.
   * 
   * @private
   * 
   * @description
   * Injects a CSS keyframe animation that provides visual feedback when
   * items are dropped or pasted into this frame.
   */
  addDropInAnimation() {
    // Add animation for dropped items
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dropIn {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
