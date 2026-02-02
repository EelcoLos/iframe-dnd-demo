# Iframe DnD Communication API Documentation

## Overview

This package provides three ES6 modules for implementing cross-iframe drag and drop functionality with comprehensive communication between parent and child iframes.

## Modules

### iframe-communication.js
**Parent window coordinator** - Manages drag and drop operations across multiple iframes.

### draggable-items-communication.js
**Child iframe (draggable items)** - Manages items that can be dragged within and between frames.

### drop-zones-communication.js
**Child iframe (drop zones)** - Manages zones that accept dropped items.

## Quick Start

### Parent Window

```javascript
import { IframeCommunicationManager } from './iframe-communication.js';

const manager = new IframeCommunicationManager();
manager.initialize([
  { id: 'source-panel', element: document.getElementById('frame-a') },
  { id: 'target-panel', element: document.getElementById('frame-b') }
]);
```

### Child Frame (Draggable Items)

```javascript
import { DraggableItemsManager } from './draggable-items-communication.js';

const manager = new DraggableItemsManager({ frameId: 'source-panel' });
manager.initialize();
```

### Child Frame (Drop Zones)

```javascript
import { DropZonesManager } from './drop-zones-communication.js';

const manager = new DropZonesManager({ frameId: 'target-panel' });
manager.initialize();
```

## Key Features

### Generic Frame IDs
No hardcoded frame names - use any identifier you want:

```javascript
manager.initialize([
  { id: 'my-custom-source', element: frameA },
  { id: 'another-target', element: frameB },
  { id: 'preview', element: frameC }
]);
```

### Receive-Only Mode
Frames can be configured to only receive drops, not send drags:

```javascript
const manager = new DraggableItemsManager({
  frameId: 'preview-panel',
  receiveOnly: true  // Items cannot be dragged out
});
```

### Keyboard Support
- **Arrow Keys**: Navigate between items/zones
- **Ctrl+C / Cmd+C**: Copy selected item
- **Ctrl+V / Cmd+V**: Paste item

### Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox (with Enhanced Tracking Protection)
- ✅ Safari/WebKit
- ✅ Touch-enabled devices

## Architecture

```
┌─────────────────────────────────────┐
│     Parent Window (Coordinator)     │
│  ┌────────────────────────────────┐ │
│  │ IframeCommunicationManager     │ │
│  │ - Manages drag preview         │ │
│  │ - Routes messages              │ │
│  │ - Handles pointer events       │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
         │                │
         ▼                ▼
┌─────────────────┐ ┌─────────────────┐
│  Child Frame A  │ │  Child Frame B  │
│ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ Draggable   │ │ │ │ Drop Zones  │ │
│ │ Items Mgr   │ │ │ │ Manager     │ │
│ └─────────────┘ │ │ └─────────────┘ │
└─────────────────┘ └─────────────────┘
```

## Message Protocol

### Parent → Child Messages

- **parentDragMove**: Notify frame of drag movement
  ```javascript
  { type: 'parentDragMove', x: number, y: number, dragData: object }
  ```

- **parentDrop**: Complete drop operation
  ```javascript
  { type: 'parentDrop', x: number, y: number, dragData: object }
  ```

- **parentDragLeave**: Clear hover state
  ```javascript
  { type: 'parentDragLeave' }
  ```

- **removeItem**: Remove moved item
  ```javascript
  { type: 'removeItem', id: string }
  ```

- **pasteItem**: Paste from clipboard
  ```javascript
  { type: 'pasteItem', itemData: object }
  ```

### Child → Parent Messages

- **dragStart**: Initiate drag
  ```javascript
  { type: 'dragStart', text: string, id: string, source: string }
  ```

- **dragMove**: Update drag position
  ```javascript
  { type: 'dragMove', clientX: number, clientY: number, source: string }
  ```

- **dragEnd**: Complete drag
  ```javascript
  { type: 'dragEnd', clientX: number, clientY: number, source: string }
  ```

- **dropSuccess/dropFailed**: Drop result
  ```javascript
  { type: 'dropSuccess'|'dropFailed', dragData: object }
  ```

- **itemCopied**: Item copied to clipboard
  ```javascript
  { type: 'itemCopied', itemData: object }
  ```

- **requestPaste**: Request paste operation
  ```javascript
  { type: 'requestPaste', target: string }
  ```

## Security

All messages validate origin before processing:

```javascript
if (event.origin !== window.location.origin) return;
```

**Same-origin requirement**: All iframes must be served from the same origin (protocol, domain, and port).

## Advanced Usage

### Multiple Frames

```javascript
manager.initialize([
  { id: 'palette', element: document.getElementById('palette') },
  { id: 'canvas', element: document.getElementById('canvas') },
  { id: 'trash', element: document.getElementById('trash') },
  { id: 'library', element: document.getElementById('library') }
]);
```

### Table Demo (Copy Semantics)

Frames ending with `-table` suffix use copy instead of move:

```javascript
// Frame sends with source: 'frame-a-table'
// Item is copied, not moved from source
```

### Custom Styling

Required CSS classes:
- `.draggable` - Draggable items
- `.dragging` - Item being dragged
- `.drop-zone` - Drop target zone
- `.dropped-item` - Item in drop zone
- `.hover` - Hover feedback
- `.selected` - Keyboard selected item
- `.drag-preview` - Parent drag preview

## API Reference

For detailed API documentation, see the generated JSDoc documentation in the `docs/` directory.

### Generate Documentation

```bash
npm run docs
```

This will generate complete API documentation with:
- Class descriptions
- Method signatures
- Parameter types
- Return values
- Usage examples
- Type definitions

## Examples

See the `/public` directory for complete working examples:
- `parent.html` - Parent coordinator setup
- `frame-a.html` - Draggable items frame
- `frame-b.html` - Drop zones frame
- `frame-a-table.html` - Table with copy semantics
- `frame-b-table.html` - Table with copy semantics

## License

MIT
