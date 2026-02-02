# 🎯 iframe-dnd-demo

A demonstration of drag-and-drop functionality using custom Pointer Events (no HTML5 Drag & Drop API). Features both **iframe-based** and **cross-window** implementations.

## 🌐 Live Demo

View the live demo at: **[https://eelcolos.github.io/iframe-dnd-demo/](https://eelcolos.github.io/iframe-dnd-demo/)**

## 📋 Overview

This demo offers two modes of drag-and-drop implementation:

### 🖼️ iFrame Mode
Classic drag-and-drop between two same-origin iframes:
- **Parent page** (`/parent.html`) that hosts two iframes
- **Frame A** (`/frame-a.html`) containing draggable items
- **Frame B** (`/frame-b.html`) containing drop zones
- Custom **Pointer Events-based** drag and drop implementation
- Cross-iframe coordinate conversion
- Real-time hover highlighting
- Visual drag preview

### 🪟 Cross-Window Mode (NEW!)
Drag and drop between **separate browser windows/tabs**:
- **Coordinator page** (`/parent-windows.html`) for managing windows
- **Standalone draggable items window** (`/window-frame-a.html`)
- **Standalone drop zones window** (`/window-frame-b.html`)
- Uses **BroadcastChannel API** for cross-window communication
- Windows can be positioned anywhere on your screen
- Real-time synchronization between windows
- Works across multiple browser tabs

## 🏗️ Architecture

### iFrame Mode Architecture

#### Parent Page
- Hosts both iframes
- Listens for drag start/end messages from Frame A
- Tracks pointer movements across the entire page
- Uses `elementFromPoint` to detect which iframe is under the cursor
- Converts parent coordinates to Frame B coordinates
- Communicates with Frame B via `postMessage` for hover highlighting and drops

#### Frame A (Draggables)
- Contains draggable items with pointer event handlers
- Sends `dragStart` and `dragEnd` messages to parent via `postMessage`
- Uses pointer capture for reliable tracking

#### Frame B (Drop Zones)
- Contains drop zones that can receive items
- Exposes `__onParentDragMove` and `__onParentDrop` functions
- Listens for messages from parent to handle hover and drop events
- Uses `elementFromPoint` to determine which drop zone is under the cursor

### Cross-Window Mode Architecture

#### BroadcastChannel Communication
- Uses `BroadcastChannel` API for publish-subscribe messaging
- All windows subscribe to the same channel name
- Messages are broadcast to all connected windows
- Window join/leave tracking for status management

#### Coordinator Window
- Manages opening and closing of child windows
- Displays real-time status of connected windows
- Provides instructions for usage
- Does not participate in drag operations

#### Draggable Items Window
- Standalone window with draggable items
- Broadcasts `dragStart`, `dragMove`, and `dragEnd` events
- Shows local drag preview
- Listens for `removeItem` messages to remove dropped items

#### Drop Zones Window
- Standalone window with drop zones
- Listens for drag events from other windows
- Highlights zones on mouse hover during drag
- Handles drops when drag ends while mouse is over a zone
- Can send dragged items back to other windows

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

The root index page will show a selection screen to choose between iFrame Mode and Cross-Window Mode.

## 🎮 How to Use

### iFrame Mode

1. Select "iFrame Mode" from the index page (or go to `/parent.html`)
2. You'll see two iframes side by side:
   - **Left (Frame A)**: Contains colorful draggable items
   - **Right (Frame B)**: Contains drop zones (To Do, In Progress, Done)
3. Click and drag any item from Frame A
4. Drag it over Frame B - you'll see drop zones highlight when hovered
5. Release to drop the item into a zone
6. The item will appear in the drop zone with a success animation

### Cross-Window Mode

**Important:** Cross-window mode requires opening windows in a specific order through the Coordinator.

1. Click "Cross-Window Mode" tab in the main demo (or open `/parent-windows.html` directly)
   - This opens the **Coordinator window**
2. In the Coordinator window, click "📦 Open Draggable Items Window"
   - A new window opens with draggable items
3. In the Coordinator window, click "🎯 Open Drop Zones Window"
   - Another new window opens with drop zones
4. Position the windows side-by-side on your screen
5. Drag items from the Draggable Items window
6. Drop them in the Drop Zones window
7. Items are synchronized between windows in real-time!

**Important Notes:**
- ✅ Windows MUST be opened using the buttons in the Coordinator
- ❌ Do NOT directly navigate to `window-frame-a.html` or `window-frame-b.html` 
- 🔒 Make sure pop-ups are not blocked by your browser
- 🪟 Keep all three windows open during drag operations

If you open child windows incorrectly, you'll see a warning banner with instructions. See [CROSS-WINDOW-GUIDE.md](./CROSS-WINDOW-GUIDE.md) for detailed troubleshooting.

## 🛠️ Technical Implementation

### iFrame Mode - Pointer Events Flow

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

### Cross-Window Mode - BroadcastChannel Flow

1. **Window Initialization**:
   - Each window creates a `HybridCommunicationManager`
   - Tries BroadcastChannel first, tests if it works
   - Falls back to window.postMessage if BroadcastChannel is partitioned
   - Coordinator registers child window references for message relay
   - Announces presence with `windowJoined` message

2. **Drag Start**:
   - User drags item in Draggable Items window
   - Broadcasts `dragStart` event (via BroadcastChannel or postMessage)
   - Shows local drag preview in source window
   - Drop Zones window enters "drag active" state

3. **Drag Detection**:
   - Drop Zones window uses `mouseenter`/`mouseleave` events
   - Highlights zones when mouse hovers during active drag
   - Tracks which zone is currently hovered

4. **Drop**:
   - On `pointerup`, source window broadcasts `dragEnd`
   - Drop Zones window checks if mouse is over window and a zone
   - If yes, adds item to zone and broadcasts `removeItem`
   - Source window removes item from its list
   - All windows update their state

5. **Firefox Compatibility**:
   - Automatically detects BroadcastChannel partitioning
   - Seamlessly switches to postMessage relay
   - Coordinator window relays messages between children
   - No user configuration needed

### Key Features - Both Modes

- **No HTML5 DnD**: Uses Pointer Events API for better control
- **Visual Feedback**: Hover highlights and drag preview
- **Pointer Capture**: Ensures reliable drag tracking even with fast mouse movements

**iFrame Mode Specific:**
- **Same-Origin**: All iframes are served from the same origin
- **Coordinate Conversion**: Parent converts its coordinates to Frame B's coordinate system

**Cross-Window Mode Specific:**
- **Hybrid Communication**: BroadcastChannel with automatic postMessage fallback
- **Firefox Compatible**: Works perfectly on Firefox despite ETP restrictions
- **Window Registry**: Automatic tracking of active windows
- **Independent Windows**: Can be positioned anywhere on screen
- **Graceful Degradation**: Checks for BroadcastChannel support and adapts

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

# Generate API documentation
npm run docs

# Generate and serve API documentation
npm run docs:serve
```

## 📚 API Documentation

This project includes comprehensive JSDoc documentation for all modules. To generate and view the full API documentation:

```bash
npm install  # Install JSDoc dependencies
npm run docs  # Generate documentation in docs/ directory
```

For a quick API overview, see [API.md](./API.md).

### Documentation Features
- ✅ Complete JSDoc comments for all classes and methods
- ✅ Type definitions and parameter documentation
- ✅ Usage examples and code samples
- ✅ Module architecture explanations
- ✅ Message protocol documentation
- ✅ Browser compatibility notes

## 📝 Project Structure

```
iframe-dnd-demo/
├── public/
│   # iFrame Mode files
│   ├── parent.html                      # Parent page hosting iframes
│   ├── frame-a.html                     # Draggable items iframe
│   ├── frame-b.html                     # Drop zones iframe
│   ├── frame-a-table.html               # Table demo - draggable rows
│   ├── frame-b-table.html               # Table demo - drop zones
│   ├── iframe-communication.js          # Parent coordination module
│   ├── draggable-items-communication.js # Draggable items module
│   ├── drop-zones-communication.js      # Drop zones module
│   # Cross-Window Mode files (NEW)
│   ├── parent-windows.html              # Coordinator for managing windows
│   ├── window-frame-a.html              # Standalone draggable items window
│   ├── window-frame-b.html              # Standalone drop zones window
│   ├── hybrid-communication.js          # Hybrid BroadcastChannel/postMessage manager (Firefox compatible)
│   └── broadcast-communication.js       # BroadcastChannel manager (legacy, Chrome/Edge only)
├── src/
│   └── ...                              # React app (not used in this demo)
├── e2e/
│   └── *.spec.ts                        # Playwright E2E tests
├── index.html                           # Landing page with mode selection
├── package.json
├── vite.config.ts
└── README.md
```

## 🔧 Using the Modules

### iFrame Mode Modules

The iframe communication has been modularized into reusable ES6 modules. Here's how to use them:

#### Parent Window (Coordinator)

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

### Cross-Window Mode Modules (NEW)

The BroadcastChannel-based communication enables drag and drop between separate windows:

#### HybridCommunicationManager (Recommended for Cross-Window)

```javascript
import { HybridCommunicationManager } from './hybrid-communication.js';

// Coordinator window (opens child windows)
const coordinator = new HybridCommunicationManager({
  windowId: 'coordinator',
  channelName: 'iframe-dnd-channel' // optional
});

coordinator.initializeAsCoordinator();

// Register child windows for postMessage relay (Firefox compatibility)
const childWindow = window.open('child.html', 'Child', 'width=500,height=600');
coordinator.registerWindow('child-window', childWindow);

// Child window
const child = new HybridCommunicationManager({
  windowId: 'child-window'
});

child.initializeAsChild();

// Listen for messages (same API for both coordinator and child)
child.on('dragStart', (data, sourceWindowId) => {
  console.log('Drag started from', sourceWindowId, data);
});

// Broadcast to all windows
child.broadcast('dragStart', {
  text: 'Item 1',
  id: '1'
});

// Send to specific window
child.sendTo('target-window', 'drop', { itemId: '1' });

// Get list of connected windows
const windows = child.getKnownWindows();
```

**Key Features:**
- ✅ **Hybrid Communication**: BroadcastChannel with automatic postMessage fallback
- ✅ **Firefox Compatible**: Detects and handles BroadcastChannel partitioning
- ✅ **Pub/Sub Pattern**: Broadcast messages to all connected windows
- ✅ **Window Registry**: Automatic tracking of active windows
- ✅ **Event Handlers**: Register callbacks for specific message types
- ✅ **Coordinator Pattern**: Central relay for message routing when needed
- ✅ **Graceful Cleanup**: Announces window departure on close

#### BroadcastCommunicationManager (Legacy - Chrome/Edge only)

```javascript
import { BroadcastCommunicationManager } from './broadcast-communication.js';

// Create manager with unique window ID
const broadcast = new BroadcastCommunicationManager({
  windowId: 'my-window',
  channelName: 'iframe-dnd-channel' // optional, defaults to 'iframe-dnd-channel'
});

broadcast.initialize();

// Listen for messages
broadcast.on('dragStart', (data, sourceWindowId) => {
  console.log('Drag started from', sourceWindowId, data);
});

// Broadcast to all windows
broadcast.broadcast('dragStart', {
  text: 'Item 1',
  id: '1'
});

// Send to specific window
broadcast.sendTo('target-window', 'drop', { itemId: '1' });

// Get list of connected windows
const windows = broadcast.getKnownWindows();
```

**Note:** This manager only uses BroadcastChannel and may not work on Firefox. Use `HybridCommunicationManager` for cross-browser compatibility.

## 🎨 Features

**Both Modes:**
- ✅ Custom Pointer Events-based drag and drop
- ✅ Real-time hover feedback
- ✅ Visual drag preview
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Touch-friendly (touch-action: none)
- ✅ Keyboard copy-paste support (iFrame mode)

**iFrame Mode Specific:**
- ✅ Cross-iframe communication via `postMessage`
- ✅ Coordinate system conversion
- ✅ Table row drag and drop demo

**Cross-Window Mode Specific:**
- ✅ BroadcastChannel API for cross-window communication
- ✅ Separate browser windows/tabs
- ✅ Real-time window status tracking
- ✅ Window positioning freedom

## 🌐 Browser Compatibility & Known Issues

### BroadcastChannel API Support

The Cross-Window mode requires the BroadcastChannel API, which is supported in:
- ✅ Chrome/Edge 54+
- ✅ Firefox 38+
- ✅ Safari 15.4+
- ✅ Opera 41+

**Not supported in:**
- ❌ Internet Explorer (use iFrame mode instead)

**Firefox Compatibility:**
Firefox's Enhanced Tracking Protection (ETP) partitions BroadcastChannel between windows opened with `window.open()`. The demo automatically detects this and falls back to `window.postMessage` relay through the coordinator window. This ensures the cross-window demo works perfectly on Firefox without any user configuration needed.

### iFrame Mode - Firefox Enhanced Tracking Protection

Firefox's Enhanced Tracking Protection (ETP) can interfere with cross-iframe communication when using wildcard (`'*'`) as the target origin in `postMessage` calls. This project has been updated to use explicit origins (`window.location.origin`) instead of wildcards to ensure compatibility with Firefox's default and strict ETP settings.

**What was fixed:**
- All `postMessage` calls now specify the actual origin instead of using `'*'`
- This ensures keyboard copy-paste and drag-and-drop work correctly on Firefox with ETP enabled

**If you experience issues:**
1. Ensure you're using the same origin for all iframes (same protocol, domain, and port)
2. Check that your browser's Enhanced Tracking Protection is not set to custom mode blocking same-origin communication
3. For development, you may need to add a localhost exception in Firefox's ETP settings

### Same-Origin Requirement (iFrame Mode)

The iFrame mode requires all iframes to be served from the same origin. Cross-origin iframe communication would require additional CORS configuration and is not supported in this demo.

### Pop-up Blocker (Cross-Window Mode)

The cross-window mode opens new browser windows, which may be blocked by pop-up blockers. Make sure to allow pop-ups for the demo site.

## 📄 License

MIT
