/**
 * @fileoverview Drop zones communication module for child iframes.
 * 
 * @module drop-zones-communication
 * @description
 * This module provides the `DropZonesManager` class which manages drop zones
 * within a child iframe. It handles accepting drops from other frames, managing
 * draggable items within drop zones, and supporting keyboard-based operations.
 * 
 * @example
 * // Standard usage
 * import { DropZonesManager } from './drop-zones-communication.js';
 * 
 * const manager = new DropZonesManager({ frameId: 'target-panel' });
 * manager.initialize();
 * 
 * @example
 * // Receive-only mode (items in zones cannot be dragged out)
 * const manager = new DropZonesManager({
 *   frameId: 'locked-panel',
 *   receiveOnly: true
 * });
 * manager.initialize();
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * @typedef {Object} DropZoneOptions
 * @property {string} frameId - Unique identifier for this frame
 * @property {boolean} [receiveOnly=false] - If true, dropped items cannot be dragged out
 */

/**
 * @typedef {Object} ItemData
 * @property {string} id - Unique identifier for the item
 * @property {string} text - Display text for the item
 * @property {string} source - Frame ID where the item originated
 */

/**
 * Manager for drop zones in child iframes.
 * 
 * @class DropZonesManager
 * @description
 * Manages drop zones by:
 * - Setting up pointer event handlers for dropped items
 * - Receiving drop events from parent window
 * - Providing visual feedback during drag operations
 * - Supporting keyboard-based navigation and paste operations
 * - Optional receive-only mode to prevent items from being dragged out
 * 
 * @example
 * // Create a drop zones manager
 * const manager = new DropZonesManager({ frameId: 'zones-panel' });
 * manager.initialize();
 * 
 * @example
 * // Create a receive-only manager (items cannot be dragged out)
 * const manager = new DropZonesManager({
 *   frameId: 'readonly-panel',
 *   receiveOnly: true
 * });
 * manager.initialize();
 */
export class DropZonesManager {
  /**
   * Create a drop zones manager.
   * 
   * @constructor
   * @param {DropZoneOptions|string} options - Configuration options or frame ID string
   * @throws {Error} If frameId is not provided
   * 
   * @description
   * Supports both object-based and string-based constructor arguments for
   * backward compatibility. When receiveOnly is true, dropped items will not
   * have drag handlers attached, preventing them from being dragged out.
   * 
   * @example
   * // Object-based (recommended)
   * const manager = new DropZonesManager({
   *   frameId: 'drop-panel',
   *   receiveOnly: false
   * });
   * 
   * @example
   * // String-based (backward compatible)
   * const manager = new DropZonesManager('drop-panel');
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
     * Whether this frame is receive-only (dropped items cannot be dragged out)
     * @type {boolean}
     * @public
     */
    this.receiveOnly = receiveOnly;
    
    /**
     * Currently hovered drop zone during drag
     * @type {HTMLElement|null}
     * @private
     */
    this.currentHoverZone = null;
    
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
     * Currently selected zone for keyboard operations
     * @type {HTMLElement|null}
     * @private
     */
    this.selectedZone = null;
  }

  /**
   * Initialize the manager.
   * 
   * @description
   * Sets up event handlers based on the receiveOnly flag:
   * - If receiveOnly is false: Sets up drag handlers and keyboard handlers
   * - If receiveOnly is true: Only sets up message listener for receiving drops
   * - Always sets up message listener
   */
  initialize() {
    if (!this.receiveOnly) {
      this.setupDragHandlers();
      this.setupKeyboardHandlers();
    }
    this.setupMessageListener();
  }

  /**
   * Set up drag handlers for dropped items.
   * 
   * @private
   * 
   * @description
   * Attaches pointerdown event listeners to all dropped items in the zones.
   * Called during initialization unless receiveOnly mode is enabled.
   */
  setupDragHandlers() {
    document.querySelectorAll('.dropped-item').forEach(item => {
      item.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    });
  }

  /**
   * Handle pointer down events on dropped items.
   * 
   * @param {PointerEvent} e - The pointer event
   * @private
   * 
   * @description
   * Initiates a potential drag operation for items in drop zones.
   * Similar to draggable items, uses a 5px threshold before starting drag.
   */
  handlePointerDown(e) {
    // Only handle if clicking directly on the dropped item
    if (!e.target.classList.contains('dropped-item')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
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
   * Tracks pointer movement and starts the drag when movement exceeds threshold.
   * Sends drag move messages to parent for cross-iframe tracking.
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
        id: this.currentDragElement.dataset.id || `item-${Date.now()}`,
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
   * Releases pointer capture, cleans up listeners, and notifies parent of drag end.
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
   * Provides visual feedback by adding hover class to the drop zone under the pointer.
   */
  onParentDragMove(x, y, dragData) {
    // Find which drop zone is under the coordinates
    const element = document.elementFromPoint(x, y);
    const dropZone = element?.closest('.drop-zone');

    if (dropZone && dropZone !== this.currentHoverZone) {
      // Clear previous hover
      if (this.currentHoverZone) {
        this.currentHoverZone.classList.remove('hover');
      }
      
      // Set new hover
      this.currentHoverZone = dropZone;
      this.currentHoverZone.classList.add('hover');
    } else if (!dropZone && this.currentHoverZone) {
      // Clear hover if not over any drop zone
      this.currentHoverZone.classList.remove('hover');
      this.currentHoverZone = null;
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
   * Creates a new dropped item element in the appropriate drop zone.
   * Handles both cross-frame drops and intra-frame moves between zones.
   * In receive-only mode, dropped items will not have drag handlers attached.
   */
  onParentDrop(x, y, dragData) {
    // Find which drop zone is under the coordinates
    const element = document.elementFromPoint(x, y);
    const dropZone = element?.closest('.drop-zone');

    if (dropZone) {
      // If dragging within the same frame, remove the old item first
      // This prevents duplicate IDs when moving between zones
      if (dragData.source === this.frameId) {
        const oldItem = Array.from(document.querySelectorAll('.dropped-item'))
          .find(item => item.dataset.id === dragData.id);
        if (oldItem) {
          oldItem.remove();
        }
      }
      
      // Add the dropped item to this zone
      const droppedItemsContainer = dropZone.querySelector('.dropped-items');
      const droppedItem = document.createElement('div');
      droppedItem.className = 'dropped-item';
      droppedItem.dataset.id = dragData.id || `item-${Date.now()}`;
      droppedItem.textContent = dragData.text;
      droppedItemsContainer.appendChild(droppedItem);

      // Set up drag handler for the new item only if this frame is not receive-only
      if (!this.receiveOnly) {
        droppedItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      }

      // Clear hover state
      dropZone.classList.remove('hover');
      this.currentHoverZone = null;
      
      // Notify parent that the drop was successful
      window.parent.postMessage({
        type: 'dropSuccess',
        dragData: dragData
      }, window.location.origin);
    } else {
      // Notify parent that the drop failed (not over a valid drop zone)
      window.parent.postMessage({
        type: 'dropFailed',
        dragData: dragData
      }, window.location.origin);
    }
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Validate message origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'parentDragMove') {
        this.onParentDragMove(event.data.x, event.data.y, event.data.dragData);
      } else if (event.data.type === 'parentDrop') {
        this.onParentDrop(event.data.x, event.data.y, event.data.dragData);
      } else if (event.data.type === 'parentDragLeave') {
        if (this.currentHoverZone) {
          this.currentHoverZone.classList.remove('hover');
          this.currentHoverZone = null;
        }
      } else if (event.data.type === 'removeItem') {
        this.handleRemoveItem(event.data.id);
      } else if (event.data.type === 'pasteItem' && event.data.itemData) {
        this.handlePasteItem(event.data.itemData);
      }
    });
  }

  handleRemoveItem(itemId) {
    // Remove item when it's successfully dropped elsewhere
    const itemToRemove = Array.from(document.querySelectorAll('.dropped-item'))
      .find(item => item.dataset.id === itemId);
    if (itemToRemove) {
      itemToRemove.style.transition = 'all 0.2s ease';
      itemToRemove.style.opacity = '0';
      itemToRemove.style.transform = 'scale(0.8)';
      setTimeout(() => itemToRemove.remove(), 200);
    }
  }

  handlePasteItem(itemData) {
    // Paste the item into the selected zone
    if (this.selectedZone) {
      const droppedItemsContainer = this.selectedZone.querySelector('.dropped-items');
      const droppedItem = document.createElement('div');
      droppedItem.className = 'dropped-item';
      droppedItem.dataset.id = itemData.id || `pasted-${Date.now()}`;
      droppedItem.textContent = itemData.text;
      droppedItemsContainer.appendChild(droppedItem);

      // Set up drag handler for the new item (only if not receive-only)
      if (!this.receiveOnly) {
        droppedItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      }
      
      // Visual feedback
      droppedItem.style.animation = 'dropIn 0.3s ease';
      
      // Notify parent that paste was successful
      window.parent.postMessage({
        type: 'pasteSuccess',
        itemData: itemData
      }, window.location.origin);
    }
  }

  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      const dropZones = Array.from(document.querySelectorAll('.drop-zone'));
      if (dropZones.length === 0) return;

      // Arrow key navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (!this.selectedZone) {
          // Select first zone
          this.selectedZone = dropZones[0];
          this.selectedZone.classList.add('selected');
        } else {
          const currentIndex = dropZones.indexOf(this.selectedZone);
          let newIndex;
          
          if (e.key === 'ArrowDown') {
            newIndex = (currentIndex + 1) % dropZones.length;
          } else {
            newIndex = (currentIndex - 1 + dropZones.length) % dropZones.length;
          }
          
          this.selectedZone.classList.remove('selected');
          this.selectedZone = dropZones[newIndex];
          this.selectedZone.classList.add('selected');
        }
      }
      // Paste functionality (Ctrl+V or Cmd+V)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        
        if (!this.selectedZone) {
          // Auto-select first zone if none selected
          this.selectedZone = dropZones[0];
          this.selectedZone.classList.add('selected');
        }
        
        // Request paste from parent
        window.parent.postMessage({
          type: 'requestPaste',
          target: this.frameId
        }, window.location.origin);
      }
    });
  }
}
