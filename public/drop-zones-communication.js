/**
 * Drop zones communication module
 * Handles drag and drop for drop zones in child iframes
 */

export class DropZonesManager {
  /**
   * Create a drop zones manager
   * @param {Object} options - Configuration options
   * @param {string} options.frameId - Unique identifier for this frame
   * @param {boolean} [options.receiveOnly=false] - If true, frame can only receive drops, not send drags
   */
  constructor(options = {}) {
    const { frameId, receiveOnly = false } = typeof options === 'string' 
      ? { frameId: options, receiveOnly: false } 
      : options;
      
    if (!frameId) {
      throw new Error('frameId is required');
    }
    
    this.frameId = frameId;
    this.receiveOnly = receiveOnly;
    this.currentHoverZone = null;
    this.currentDragElement = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.isDragging = false;
    this.selectedZone = null;
  }

  /**
   * Initialize the manager
   */
  initialize() {
    if (!this.receiveOnly) {
      this.setupDragHandlers();
      this.setupKeyboardHandlers();
    }
    this.setupMessageListener();
  }

  /**
   * Set up drag handlers for dropped items
   */
  setupDragHandlers() {
    document.querySelectorAll('.dropped-item').forEach(item => {
      item.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    });
  }

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

      // Set up drag handler for the new item
      droppedItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));

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

      // Set up drag handler for the new item
      droppedItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      
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
