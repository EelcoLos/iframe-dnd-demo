# 🎯 iframe-dnd-demo

A demonstration of drag-and-drop functionality using custom Pointer Events (no HTML5 Drag & Drop API). Features **iframe-based**, **cross-window**, and **native WebView2 application** implementations.

## 🌐 Live Demo

View the live demo at: **[https://eelcolos.github.io/iframe-dnd-demo/](https://eelcolos.github.io/iframe-dnd-demo/)**

## 📋 Overview

This demo implements cross-iframe and cross-window drag-and-drop systems:

**iFrame Mode** - Classic drag-and-drop between two same-origin iframes
**Cross-Window Mode** - Drag and drop between separate browser windows/tabs
**WebView2 Native App** - Native Windows application hosting all demos in WebView2 controls

Both modes use custom Pointer Events for precise control and cross-context coordinate conversion.

## 🖥️ WebView2 Native Application

A full native Windows WPF application is included that demonstrates all the drag-and-drop capabilities using Microsoft's WebView2 control. This provides a real desktop application experience with all the web-based demos.

**📖 See [WEBVIEW2.md](WEBVIEW2.md) for complete overview**  
**⚡ See [WebView2App/QUICKSTART.md](WebView2App/QUICKSTART.md) to get started**  
**📚 See [WebView2App/README.md](WebView2App/README.md) for building and running instructions**

### Quick Start (Windows only)

```bash
cd WebView2App
dotnet build
dotnet run
```

Features:
- ✅ Native Windows WPF application
- ✅ All three demo modes (Basic Items, Table Rows, HTML5 DnD)
- ✅ Horizontal and vertical layout options
- ✅ Built-in Edge DevTools for debugging
- ✅ Navigation controls (back, forward, refresh)
- ✅ Serves all HTML/JS demos from the public folder

## 🏗️ Architecture

### iFrame Mode

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

### Cross-Window Mode

Uses BroadcastChannel/postMessage for cross-window communication. Provides both HTML5 Drag & Drop API implementation (default, simpler) and custom Pointer Events implementation (advanced, more control).

**Usage:**
1. Click "Cross-Window Mode" tab to open coordinator
2. Open Draggable Items and Drop Zones windows
3. Drag items between windows

Windows can be positioned anywhere on your screen and across multiple monitors.

**Hybrid Variant:** A special variant combines WebView-style source (Frame A) with Desktop-style target (Frame B) tables, demonstrating interoperability between different UI implementations. Access via the "🔀 Open WebView → Desktop Coordinator" button in the Cross-Window Mode.

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

Cross-Window Mode lets you drag items between completely separate browser windows.

1. From the index page, select **"Cross-Window Mode"**
2. A coordinator page opens. Use the controls on this page to open:
   - a **Draggable Items** window, and
   - a **Drop Zones** window
3. Arrange the separate windows anywhere on your desktop (including across multiple monitors)
4. In the **Draggable Items** window, click and start dragging any item
5. While holding the mouse button (or touch), move the pointer into the **Drop Zones** window
6. Hover over a drop zone; it will respond visually when it can accept a drop
7. Release the pointer to drop the item into the hovered zone

The coordinator window manages communication between windows using BroadcastChannel (with automatic postMessage fallback for Firefox). Two implementations are available: HTML5 Drag & Drop API (default, simpler) and custom Pointer Events (advanced, more control).

### Cross-Window Table Mode

Cross-Window Table Mode extends the cross-window functionality with table-based drag-and-drop and keyboard copy/paste.

1. From the coordinator page, click **"Open Available Items Table"** and **"Open Construction Calc Table"**
2. Arrange the table windows on your screen
3. **Drag rows** from the Available Items table to the Construction Calc table
4. **Keyboard copy/paste**: 
   - Click a row to select it
   - Press **Ctrl+C** (or **Cmd+C** on Mac) to copy
   - Focus the target window and press **Ctrl+V** (or **Cmd+V**) to paste
5. The Construction Calc table automatically updates totals when rows are added

Features:
- ✅ Drag-and-drop table rows between windows
- ✅ Cross-window keyboard copy/paste (Ctrl+C, Ctrl+V)
- ✅ Automatic calculation updates
- ✅ Visual feedback (selection, copy animation, drop placeholders)
- ✅ Row data preserved (description, quantity, unit price, amount)

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
- **Visual Feedback**: Hover highlights and drag preview
- **Pointer Capture**: Ensures reliable drag tracking even with fast mouse movements
- **Same-Origin**: All iframes are served from the same origin
- **Coordinate Conversion**: Parent converts its coordinates to Frame B's coordinate system

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
│   # Cross-Window Mode files
│   ├── parent-windows.html              # Coordinator for managing windows
│   ├── window-frame-a.html              # Standalone draggable items window
│   ├── window-frame-b.html              # Standalone drop zones window
│   ├── window-frame-a-html5.html        # HTML5 DnD API draggable items window
│   ├── window-frame-b-html5.html        # HTML5 DnD API drop zones window
│   ├── window-frame-a-table.html        # Standalone construction calc table (NEW)
│   ├── window-frame-b-table.html        # Standalone available items table (NEW)
│   ├── hybrid-communication.js          # Hybrid BroadcastChannel/postMessage manager (Firefox compatible)
│   └── broadcast-communication.js       # BroadcastChannel manager (legacy, Chrome/Edge only)
├── WebView2App/                         # Native Windows WPF application (NEW)
│   ├── WebView2App.csproj               # .NET project file
│   ├── MainWindow.xaml                  # Main window UI
│   ├── MainWindow.xaml.cs               # Main window logic
│   ├── App.xaml                         # Application entry
│   ├── App.xaml.cs                      # Application code
│   └── README.md                        # Build and run instructions
├── src/
│   └── ...                              # React app (not used in this demo)
├── e2e/
│   ├── drag-and-drop.spec.ts            # Basic drag-and-drop tests
│   ├── keyboard-copy-paste.spec.ts      # Keyboard copy-paste tests
│   ├── table-keyboard-copy-paste.spec.ts # Table keyboard copy-paste tests (iframe mode)
│   └── cross-window-table.spec.ts       # Cross-window table tests (NEW)
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
