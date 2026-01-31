/**
 * Draggable items communication module
 * Handles drag and drop for draggable items in child iframes
 */

export class DraggableItemsManager {
  constructor(frameName = 'frame-a') {
    this.frameName = frameName;
    this.currentDragElement = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.isDragging = false;
    this.selectedItem = null;
    this.copiedItemData = null;
    this.currentHoverContainer = null;
  }

  /**
   * Initialize the manager with draggable items
   */
  initialize() {
    this.setupDraggables();
    this.setupMessageListener();
    this.setupKeyboardHandlers();
    this.addDropInAnimation();
  }

  /**
   * Set up draggable items
   */
  setupDraggables() {
    document.querySelectorAll('.draggable').forEach(item => {
      item.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    });
  }

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
        source: this.frameName
      }, window.location.origin);
    }

    // Continue sending pointer move events to parent while dragging
    if (this.isDragging) {
      // clientX/clientY are already relative to the iframe viewport
      window.parent.postMessage({
        type: 'dragMove',
        clientX: e.clientX,
        clientY: e.clientY,
        source: this.frameName
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
        source: this.frameName
      }, window.location.origin);
    }

    this.currentDragElement.classList.remove('dragging');
    this.currentDragElement = null;
    this.isDragging = false;
  }

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

  onParentDrop(x, y, dragData) {
    // Check if we're over the draggable items container
    const element = document.elementFromPoint(x, y);
    const container = element?.closest('.draggable-items');

    if (container && dragData.source !== this.frameName) {
      // Create a new draggable item
      const newItem = document.createElement('div');
      newItem.className = 'draggable';
      newItem.dataset.id = dragData.id || `dropped-${Date.now()}`;
      newItem.innerHTML = dragData.text;
      
      // Add to container
      container.appendChild(newItem);
      
      // Set up drag handlers for the new item
      newItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      
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
    } else if (dragData.source !== this.frameName) {
      // Notify parent that the drop failed
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

  handlePasteItem(itemData) {
    // Paste the item into this frame
    const container = document.querySelector('.draggable-items');
    if (container && itemData.source !== this.frameName) {
      const newItem = document.createElement('div');
      newItem.className = 'draggable';
      newItem.dataset.id = itemData.id || `pasted-${Date.now()}`;
      newItem.innerHTML = itemData.text;
      
      container.appendChild(newItem);
      newItem.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
      newItem.style.animation = 'dropIn 0.3s ease';
      
      // Select the newly pasted item
      if (this.selectedItem) {
        this.selectedItem.classList.remove('selected');
      }
      this.selectedItem = newItem;
      this.selectedItem.classList.add('selected');
    }
  }

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
          source: this.frameName
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
          target: this.frameName
        }, window.location.origin);
      }
    });
  }

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
