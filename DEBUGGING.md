# Debugging Cross-Window Drag & Drop

## Current Issue
Messages are being relayed from coordinator to frame-b, but nothing is visible in frame-b.

## Debug Logs to Check

With the enhanced logging now in place, here's what to look for in the console:

### 1. Check if frame-b receives messages AT ALL

**In frame-b console, look for:**
```
[frame-b DEBUG] Received raw message event: <origin> <data>
```

**What it means:**
- ✅ If you see this: Messages ARE reaching frame-b's window
- ❌ If you DON'T see this: Messages are not being delivered (check window reference in coordinator)

### 2. Check if messages pass origin validation

**In frame-b console, look for:**
```
[HybridComm] frame-b received via postMessage: dragStart from frame-a
```

**OR if rejected:**
```
[HybridComm] frame-b rejected message from wrong origin: <origin> expected: <expected>
```

**What it means:**
- ✅ "received via postMessage": Message passed validation
- ❌ "rejected message": Origin mismatch - coordinator and frame-b have different origins

### 3. Check if messages are being processed

**In frame-b console, look for:**
```
[HybridComm] frame-b processing message type="dragStart"
```

**What it means:**
- ✅ If you see this: processMessage is being called
- ❌ If you DON'T: Messages are being received but not processed (check handlePostMessage logic)

### 4. Check if handlers are registered

**In frame-b console, look for:**
```
[HybridComm] frame-b found 1 handler(s) for type "dragStart"
```

**OR:**
```
[HybridComm] frame-b NO handlers registered for message type "dragStart"
```

**What it means:**
- ✅ "found X handler(s)": Handlers are registered
- ❌ "NO handlers": broadcast.on() wasn't called or was called after message arrived

### 5. Check if dragStart handler is called

**In frame-b console, look for:**
```
[frame-b] dragStart handler called with data: {text: "...", id: "..."}
[frame-b] Drag started from another window, isDragActive: true
```

**What it means:**
- ✅ If you see this: dragStart handler executed successfully
- ❌ If you DON'T: Handler registered but not being invoked (check messageHandlers Map)

### 6. Check if dragEnd handler is called

**In frame-b console, look for:**
```
[frame-b] dragEnd handler called, isDragActive: true
```

**OR if rejected:**
```
[frame-b] dragEnd handler called, isDragActive: false
[frame-b] Ignoring dragEnd because isDragActive is false
```

**What it means:**
- ✅ "isDragActive: true": Handler will process the drop
- ❌ "isDragActive: false": dragEnd ignored because dragStart was never received or processed

### 7. Check drop conditions

**In frame-b console, look for:**
```
[frame-b] Drag ended, mouse over window: true
[frame-b] Dropping item into zone: todo
```

**OR if not dropping:**
```
[frame-b] Not dropping - isMouseOverWindow: false currentHoveredZone: null currentDragData: {...}
```

**What it means:**
- ✅ "Dropping item": All conditions met, drop will happen
- ❌ "Not dropping": Missing one of: mouse over window, hovered zone, or drag data

## Common Issues and Solutions

### Issue: Messages not reaching frame-b at all
**Symptom:** No `[frame-b DEBUG]` logs
**Cause:** Window reference is invalid or closed
**Solution:** Check coordinator logs for "Failed to open frame-b"

### Issue: Messages rejected due to origin
**Symptom:** `rejected message from wrong origin`
**Cause:** Different protocols (http vs https) or ports
**Solution:** Ensure all windows are on same origin

### Issue: NO handlers registered
**Symptom:** `NO handlers registered for message type`
**Cause:** broadcast.on() called after initialize() or timing issue
**Solution:** Ensure handlers are registered immediately after initializeAsChild()

### Issue: dragEnd ignored (isDragActive false)
**Symptom:** `Ignoring dragEnd because isDragActive is false`
**Cause:** dragStart message was never received/processed
**Solution:** Check logs for dragStart - if missing, frame-b isn't receiving messages

### Issue: Not dropping even with dragEnd received
**Symptom:** `Not dropping - isMouseOverWindow: false`
**Cause:** Mouse not over frame-b window when drag ended
**Solution:** This is expected behavior - must drag TO frame-b window

## Testing Steps

1. Open browser console
2. Arrange windows: Coordinator, frame-a, frame-b side by side
3. Open console in ALL THREE windows (F12)
4. In frame-a, start dragging an item
5. Watch logs in all three consoles simultaneously:
   - **frame-a**: Should see "broadcasting: dragStart"
   - **Coordinator**: Should see "Coordinator relaying message type='dragStart' from frame-a to other windows"
   - **frame-b**: Should see "[frame-b DEBUG] Received raw message event"

6. Move mouse over frame-b window (keep dragging)
7. Release mouse over a drop zone in frame-b
8. Watch logs in frame-b:
   - Should see "dragEnd handler called, isDragActive: true"
   - Should see "Dropping item into zone: ..."

## Expected Log Sequence (Success)

**When everything works correctly:**

```
[Coordinator] Opened and registered frame-a window
[Coordinator] Opened and registered frame-b window
[frame-a] HybridComm frame-a initialized as child, coordinator found
[frame-b] HybridComm frame-b initialized as child, coordinator found

<user drags item in frame-a>

[frame-a] HybridComm frame-a broadcasting: dragStart (via postMessage)
[Coordinator] HybridComm coordinator received via postMessage: dragStart from frame-a
[Coordinator] HybridComm Coordinator relaying message type="dragStart" from frame-a to other windows
[Coordinator] HybridComm Relaying to frame-b, message: {...}
[Coordinator] HybridComm Successfully posted message to frame-b
[frame-b] [frame-b DEBUG] Received raw message event: http://localhost:5173 {type: "dragStart", ...}
[frame-b] HybridComm frame-b received via postMessage: dragStart from frame-a
[frame-b] HybridComm frame-b processing message type="dragStart"
[frame-b] HybridComm frame-b found 1 handler(s) for type "dragStart"
[frame-b] [frame-b] dragStart handler called with data: {...}
[frame-b] [frame-b] Drag started from another window, isDragActive: true

<user releases mouse over drop zone in frame-b>

[frame-a] HybridComm frame-a broadcasting: dragEnd (via postMessage)
[Coordinator] HybridComm coordinator received via postMessage: dragEnd from frame-a
[Coordinator] HybridComm Coordinator relaying message type="dragEnd" from frame-a to other windows
[Coordinator] HybridComm Relaying to frame-b, message: {...}
[Coordinator] HybridComm Successfully posted message to frame-b
[frame-b] [frame-b DEBUG] Received raw message event: http://localhost:5173 {type: "dragEnd", ...}
[frame-b] HybridComm frame-b received via postMessage: dragEnd from frame-a
[frame-b] HybridComm frame-b processing message type="dragEnd"
[frame-b] HybridComm frame-b found 1 handler(s) for type "dragEnd"
[frame-b] [frame-b] dragEnd handler called, isDragActive: true
[frame-b] [frame-b] Drag ended, mouse over window: true
[frame-b] [frame-b] Dropping item into zone: todo
```

## Next Steps

1. Test with the enhanced logging
2. Share the console output from all 3 windows
3. Identify which step in the sequence is failing
4. Apply the appropriate fix based on the failure point
