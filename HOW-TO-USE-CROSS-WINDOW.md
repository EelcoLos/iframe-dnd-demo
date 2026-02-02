# How to Use Cross-Window Drag & Drop

## Quick Start

1. **Open the Demo**:
   - Navigate to `index.html` or `parent.html`
   - Click the "Cross-Window Mode" tab

2. **Open Windows**:
   - In the Coordinator window, click "Open Draggable Items Window"
   - Click "Open Drop Zones Window"
   - **Important**: Windows MUST be opened via these buttons (don't navigate directly)

3. **Position Windows**:
   - Arrange windows side-by-side on your screen
   - Make sure both windows are visible

4. **Drag and Drop**:
   - Start dragging an item from the Draggable Items window
   - **While holding the mouse button**, move your cursor over the Drop Zones window
   - Move over the desired drop zone (To Do, In Progress, or Done)
   - Release the mouse button to drop

## Important Requirements

### ⚠️ Mouse Must Be Over Target Window

The browser **does not provide cross-window pointer tracking**. This means:

- The Drop Zones window only knows your mouse is there when you physically move it into that window
- You must **drag WHILE moving your mouse** over the Drop Zones window
- Simply starting a drag and releasing elsewhere won't work

### Visual Feedback in Drop Zones Window

Watch for these indicators:

1. **Status Indicator** (top-right):
   - "🎬 Drag started: [item name]" - Message received
   - "🎯 Drop zone ready!" - Mouse is over window
   - "⚠️ Move mouse over window to drop" - Mouse left window
   - "✅ Dropped into [zone]!" - Success
   - "❌ Drop failed: ..." - Explains why

2. **Background Color**:
   - Normal: Gray gradient
   - During drag: Orange/warm gradient
   
3. **Drop Zones**:
   - Highlight with blue border when mouse hovers during drag
   - Scale up slightly on hover

## Troubleshooting

### "Nothing happens when I drag"

**Check**:
1. Are both windows open? (via coordinator buttons, not direct navigation)
2. Is the status indicator in Drop Zones window showing the drag started?
3. Did you move your mouse OVER the Drop Zones window while dragging?

**Solution**:
- Keep mouse button pressed
- Move cursor from Draggable Items window TO Drop Zones window
- Hover over a drop zone
- Release mouse button

### "Drag started but drop doesn't work"

**Most likely**: Mouse wasn't over the Drop Zones window when you released.

**Check the status indicator**:
- If it says "⚠️ Move mouse over window to drop", your mouse wasn't over the window
- If it says "❌ Drop failed: ...", read the specific reason

**Solution**:
- During drag, look at the Drop Zones window background
- It should turn orange/warm when drag is active
- Move your cursor INTO that window (background stays orange)
- Now move over a drop zone (it highlights blue)
- Release mouse button

### "Messages relay but nothing visible"

**You're looking at the coordinator's console instead of frame-b's console!**

Open DevTools console in **each window**:
1. Coordinator window - shows relay operations
2. Draggable Items window - shows drag events
3. **Drop Zones window** - shows receipt and drop operations

Look for logs prefixed with:
- `[frame-b] ✅ dragStart handler called` - Message received
- `[frame-b] Mouse entered window` - Your cursor is over the window
- `[frame-b] ✅ Dropping item into zone` - Success!

### "Window closed unexpectedly"

Some browsers block `window.open()` pop-ups. 

**Solution**:
- Allow pop-ups for this site
- Look for browser pop-up blocker notification
- Try again after allowing

## How It Works

### Message Flow

1. **Draggable Items window**:
   - Detects pointerdown, pointermove, pointerup
   - Broadcasts `dragStart`, `dragMove`, `dragEnd` to coordinator

2. **Coordinator window**:
   - Receives messages from Draggable Items
   - Relays to Drop Zones window via `postMessage`

3. **Drop Zones window**:
   - Receives relayed messages
   - Changes visual state (background, status indicator)
   - Detects mouse position via `mouseenter`/`mouseleave`
   - Handles drop if mouse is over window when drag ends

### Why Mouse Must Be Over Window

Browsers don't allow tracking mouse position across different windows for security/privacy. Each window only knows:
- When mouse enters its bounds (`mouseenter` event)
- When mouse leaves its bounds (`mouseleave` event)
- When mouse is over specific elements inside it

This is why you must **physically move your cursor** into the Drop Zones window during the drag operation.

## Expected Behavior

✅ **Working correctly**:
- Drag starts → Status shows "Drag started: [item]"
- Move mouse to Drop Zones window → Background turns orange, status shows "Drop zone ready!"
- Hover over zone → Zone highlights blue
- Release → Item appears in zone, status shows "✅ Dropped!"

❌ **Not a bug** (browser limitation):
- Drag starts → Drop Zones window shows drag started
- Release in Draggable Items window → No drop (mouse wasn't over Drop Zones)
- Release outside both windows → No drop (mouse wasn't over Drop Zones)

## Tips

- **Keep windows side-by-side** so you can easily move mouse between them while dragging
- **Watch the status indicator** in top-right of Drop Zones window
- **Watch the background color** - orange means drag is active and detected
- **Use full drag motion** - start drag, move to other window, release
- Check **Drop Zones window console** (F12) for detailed logs
