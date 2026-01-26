# 🎯 iframe-dnd-demo

A demonstration of drag-and-drop functionality between two same-origin iframes using custom Pointer Events (no HTML5 Drag & Drop API).

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

Once the server is running, navigate to:
```
http://localhost:5173/parent.html
```

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

## 🧪 Development

```bash
# Run linter
npm run lint
```

## 📝 Project Structure

```
iframe-dnd-demo/
├── public/
│   ├── parent.html      # Parent page hosting iframes
│   ├── frame-a.html     # Draggable items iframe
│   └── frame-b.html     # Drop zones iframe
├── src/
│   └── ...              # React app (not used in this demo)
├── package.json
├── vite.config.ts
└── README.md
```

## 🎨 Features

- ✅ Custom Pointer Events-based drag and drop
- ✅ Cross-iframe communication via `postMessage`
- ✅ Coordinate system conversion
- ✅ Real-time hover feedback
- ✅ Visual drag preview
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Touch-friendly (touch-action: none)

## 📄 License

MIT
