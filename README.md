# 🎯 iframe-dnd-demo

A demonstration of drag-and-drop functionality between two same-origin iframes using custom Pointer Events (no HTML5 Drag & Drop API).

## 🌐 Live Demo

View the live demo at: **[https://eelcolos.github.io/iframe-dnd-demo/](https://eelcolos.github.io/iframe-dnd-demo/)**

## 📋 Overview

This demo implements a cross-iframe drag-and-drop system with:
- **Parent page** (`/parent.html`) that hosts two iframes
- **Frame A** (`/frame-a.html`) containing draggable items
- **Frame B** (`/frame-b.html`) containing drop zones
- Custom **Pointer Events-based** drag and drop implementation
- Cross-iframe coordinate conversion
- Real-time hover highlighting
- Visual drag preview

## 🏗️ Architecture

### Parent Page
- Hosts both iframes
- Listens for drag start/end messages from Frame A
- Tracks pointer movements across the entire page
- Uses `elementFromPoint` to detect which iframe is under the cursor
- Converts parent coordinates to Frame B coordinates
- Communicates with Frame B via `postMessage` for hover highlighting and drops

### Frame A (Draggables)
- Contains draggable items with pointer event handlers
- Sends `dragStart` and `dragEnd` messages to parent via `postMessage`
- Uses pointer capture for reliable tracking

### Frame B (Drop Zones)
- Contains drop zones that can receive items
- Exposes `__onParentDragMove` and `__onParentDrop` functions
- Listens for messages from parent to handle hover and drop events
- Uses `elementFromPoint` to determine which drop zone is under the cursor

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
# Install dependencies
npm install
```

### Running the Demo

```bash
# Start the development server
npm run dev
```

The dev server will start (typically on `http://localhost:5173`).

### Accessing the Demo

**Online:** Visit the live demo at [https://eelcolos.github.io/iframe-dnd-demo/](https://eelcolos.github.io/iframe-dnd-demo/)

**Locally:** Once the dev server is running, navigate to:
```
http://localhost:5173/
```

The root index page will automatically redirect to `parent.html`.

## 🎮 How to Use

1. Open `/parent.html` in your browser
2. You'll see two iframes side by side:
   - **Left (Frame A)**: Contains colorful draggable items
   - **Right (Frame B)**: Contains drop zones (To Do, In Progress, Done)
3. Click and drag any item from Frame A
4. Drag it over Frame B - you'll see drop zones highlight when hovered
5. Release to drop the item into a zone
6. The item will appear in the drop zone with a success animation

## 🛠️ Technical Implementation

### Pointer Events Flow

1. **Drag Start** (Frame A):
   - User presses pointer on draggable item
   - On move with 5px threshold, drag starts
   - Frame A sends `dragStart` message to parent
   - Parent creates visual drag preview

2. **Drag Move** (Parent):
   - Parent tracks `pointermove` events
   - Updates drag preview position
   - Uses `elementFromPoint` to detect if over Frame B
   - Converts coordinates and sends `parentDragMove` to Frame B
   - Frame B uses `elementFromPoint` to find hovered drop zone

3. **Drop** (Parent → Frame B):
   - On `pointerup`, parent checks if over Frame B
   - Sends `parentDrop` message with converted coordinates
   - Frame B adds item to the drop zone
   - Parent cleans up drag state

### Key Features

- **No HTML5 DnD**: Uses Pointer Events API for better control
- **Same-Origin**: All iframes are served from the same origin
- **Coordinate Conversion**: Parent converts its coordinates to Frame B's coordinate system
- **Visual Feedback**: Hover highlights and drag preview
- **Pointer Capture**: Ensures reliable drag tracking even with fast mouse movements

## 📦 Build

```bash
# Build for production
npm run build

# Preview production build
npm preview
```

## 🧪 Testing

### E2E Tests with Playwright

The project includes comprehensive E2E tests for the drag and drop functionality.

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

### Test Coverage

The test suite includes:
- ✅ Page redirect from root to parent.html
- ✅ Display of parent page with two iframes
- ✅ Display of draggable items in Frame A
- ✅ Display of drop zones in Frame B
- ✅ Drag and drop to "To Do" zone
- ✅ Drag and drop to "In Progress" zone
- ✅ Drag and drop to "Done" zone
- ✅ Multiple items drag and drop
- ✅ Drag preview visibility during drag

## 🧪 Development

```bash
# Run linter
npm run lint
```

## 📝 Project Structure

```
iframe-dnd-demo/
├── public/
│   ├── parent.html                      # Parent page hosting iframes
│   ├── frame-a.html                     # Draggable items iframe
│   ├── frame-b.html                     # Drop zones iframe
│   ├── iframe-communication.js          # Parent coordination module
│   ├── draggable-items-communication.js # Draggable items module
│   └── drop-zones-communication.js      # Drop zones module
├── src/
│   └── ...                              # React app (not used in this demo)
├── package.json
├── vite.config.ts
└── README.md
```

## 🔧 Using the Modules

The iframe communication has been modularized into reusable ES6 modules. Here's how to use them:

### Parent Window (Coordinator)

```javascript
import { IframeCommunicationManager } from './iframe-communication.js';

const manager = new IframeCommunicationManager();

// Initialize with any number of frames using generic IDs
manager.initialize([
  { id: 'source-panel', element: document.getElementById('frame-a') },
  { id: 'target-panel', element: document.getElementById('frame-b') },
  { id: 'preview-panel', element: document.getElementById('frame-c') }
]);
```

### Child Frame (Draggable Items)

```javascript
import { DraggableItemsManager } from './draggable-items-communication.js';

// Standard usage with drag capability
const manager = new DraggableItemsManager({ 
  frameId: 'source-panel' 
});
manager.initialize();

// Receive-only mode (can only receive drops, not send drags)
const receiveOnlyManager = new DraggableItemsManager({ 
  frameId: 'preview-panel',
  receiveOnly: true 
});
receiveOnlyManager.initialize();
```

### Child Frame (Drop Zones)

```javascript
import { DropZonesManager } from './drop-zones-communication.js';

// Standard usage
const manager = new DropZonesManager({ 
  frameId: 'target-panel' 
});
manager.initialize();

// Receive-only mode
const receiveOnlyManager = new DropZonesManager({ 
  frameId: 'locked-panel',
  receiveOnly: true 
});
receiveOnlyManager.initialize();
```

**Key Features:**
- ✅ **Generic frame IDs**: No hardcoded 'frame-a' or 'frame-b' - use any identifier
- ✅ **Receive-only mode**: Frames can be configured to only receive drops
- ✅ **Scalable**: Support for any number of frames
- ✅ **Backward compatible**: Still supports simple string constructor for frameId

## 🎨 Features

- ✅ Custom Pointer Events-based drag and drop
- ✅ Cross-iframe communication via `postMessage`
- ✅ Coordinate system conversion
- ✅ Real-time hover feedback
- ✅ Visual drag preview
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Touch-friendly (touch-action: none)
- ✅ Keyboard copy-paste support

## 🌐 Browser Compatibility & Known Issues

### Firefox Enhanced Tracking Protection

Firefox's Enhanced Tracking Protection (ETP) can interfere with cross-iframe communication when using wildcard (`'*'`) as the target origin in `postMessage` calls. This project has been updated to use explicit origins (`window.location.origin`) instead of wildcards to ensure compatibility with Firefox's default and strict ETP settings.

**What was fixed:**
- All `postMessage` calls now specify the actual origin instead of using `'*'`
- This ensures keyboard copy-paste and drag-and-drop work correctly on Firefox with ETP enabled

**If you experience issues:**
1. Ensure you're using the same origin for all iframes (same protocol, domain, and port)
2. Check that your browser's Enhanced Tracking Protection is not set to custom mode blocking same-origin communication
3. For development, you may need to add a localhost exception in Firefox's ETP settings

### Same-Origin Requirement

This demo requires all iframes to be served from the same origin. Cross-origin iframe communication would require additional CORS configuration and is not supported in this demo.

## 📄 License

MIT
