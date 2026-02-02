# Cross-Window Drag & Drop - User Guide

## How It Works

The Cross-Window Mode allows you to drag items between separate browser windows. Here's the complete workflow:

### Step-by-Step Instructions

1. **Access the Demo**
   - Navigate to `http://localhost:5173/iframe-dnd-demo/` (or the deployed URL)
   - You'll see the main demo page with three tabs

2. **Open Cross-Window Mode**
   - Click the "Cross-Window Mode" tab (the third tab)
   - This will open a new window called the "Coordinator"

3. **Open the Windows**
   - In the Coordinator window, click "📦 Open Draggable Items Window"
     - A new window will open with draggable items
   - Then click "🎯 Open Drop Zones Window"  
     - Another new window will open with drop zones

4. **Arrange Your Windows**
   - You should now have 3 windows open:
     - Coordinator (shows status)
     - Draggable Items (has colored items to drag)
     - Drop Zones (has three zones: To Do, In Progress, Done)
   - Arrange them side-by-side on your screen

5. **Drag and Drop**
   - Click and hold on any item in the Draggable Items window
   - Drag your mouse over to the Drop Zones window
   - The drop zone will highlight when you hover over it
   - Release the mouse to drop the item

### Important Notes

- **Pop-up Blocker**: Make sure your browser allows pop-ups for this site
- **All Windows Must Stay Open**: Don't close any of the windows during drag operations
- **Firefox/Edge**: The system automatically uses postMessage if BroadcastChannel is blocked

## Troubleshooting

### Items won't drag

**Check 1: Are all windows open correctly?**
- Open browser console (F12) in each window
- Look for errors in red
- If you see "has NO coordinator window!", the window was opened incorrectly

**Check 2: Were windows opened via Coordinator?**
- You MUST click the buttons in the Coordinator window
- Do NOT directly navigate to `window-frame-a.html` or `window-frame-b.html`
- If you see a red warning banner, close that window and reopen via Coordinator

**Check 3: Check console logs**
- In Coordinator window: Should see "Opened and registered frame-a window"
- In child windows: Should see "initialized as child, coordinator found"
- During drag: Should see "broadcasting: dragStart" in draggable window

### Windows won't open

**Pop-up blocker:**
- Check if pop-ups are blocked
- Look for a blocked pop-up icon in the address bar
- Allow pop-ups for this site
- Try again

### Drop doesn't work

**Check the message flow:**
1. Open console in all 3 windows (Coordinator, frame-a, frame-b)
2. Start a drag in frame-a
3. Look for logs:
   - frame-a: `[HybridComm] frame-a broadcasting: dragStart`
   - Coordinator: `[HybridComm] Coordinator relaying message type="dragStart"`
   - frame-b: `[HybridComm] frame-b received via postMessage: dragStart`

4. If you don't see these messages, the relay isn't working

**Mouse detection:**
- Make sure your mouse is actually over the Drop Zones window when you release
- The zone should turn blue when you hover
- Try moving slowly to ensure the hover is detected

### Advanced Debugging

**Enable verbose logging:**
- Open browser console (F12) in all windows
- Watch for messages starting with `[HybridComm]`
- These show exactly what's happening with communication

**Check window registration:**
- In Coordinator console, after opening windows, check:
  - `broadcast.getKnownWindows()` should return `['frame-a', 'frame-b']`
  
**Verify postMessage relay:**
- BroadcastChannel will be partitioned on Firefox/Edge when using `window.open()`
- The system should automatically fall back to postMessage
- You should see "using postMessage fallback" in console

## Technical Details

### Communication Architecture

**When BroadcastChannel Works (Chrome without ETP):**
- Messages broadcast directly between all windows
- No coordinator relay needed
- Faster and simpler

**When Using postMessage Fallback (Firefox, Edge):**
```
frame-a → postMessage → Coordinator → postMessage → frame-b
        (to opener)                 (relay)
```

The Coordinator acts as a message relay because:
1. Firefox's Enhanced Tracking Protection partitions BroadcastChannel
2. Windows opened via `window.open()` can communicate with their opener via postMessage
3. The Coordinator relays messages between the children

### Why Direct Navigation Doesn't Work

If you directly navigate to `window-frame-a.html`:
- `window.opener` is `null` (no coordinator)
- postMessage has nowhere to send messages
- BroadcastChannel is partitioned (on Firefox/Edge)
- Result: No communication possible

### Message Types

- `windowJoined`: Announces when a window connects
- `windowLeft`: Announces when a window closes
- `dragStart`: Initiates a drag operation
- `dragMove`: Updates drag position (currently not used for cross-window)
- `dragEnd`: Completes drag, triggers drop check
- `removeItem`: Tells source window to remove dragged item
- `parentDrop`: Alternative drop notification

## Browser Compatibility

| Browser | Status | Method |
|---------|--------|--------|
| Chrome 54+ | ✅ Works | BroadcastChannel (usually) or postMessage fallback |
| Firefox 38+ | ✅ Works | postMessage relay (ETP blocks BroadcastChannel) |
| Edge 79+ | ✅ Works | postMessage relay |
| Safari 15.4+ | ✅ Works | BroadcastChannel or postMessage |

## Still Having Issues?

1. **Try the iframe mode first** - Click "Basic Items Demo" tab to verify core drag/drop works
2. **Check browser console** - Look for errors or warnings
3. **Ensure pop-ups allowed** - Coordinator can't open windows if blocked
4. **Follow exact order** - Coordinator → frame-a → frame-b
5. **Keep all windows visible** - Don't minimize or close during operation
