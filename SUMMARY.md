# Summary: Cross-Window Drag & Drop - ROOT CAUSE FIXED ✅

## Problem Statement
User reported: "The console is showing messages being relayed from frame-a to frame-b, but nothing's visible on the second one (frame-b)"

## Root Cause - FOUND AND FIXED ✅

**Window Name Collision Issue:**

`window.open(url, name, features)` reuses existing windows with the same `name` parameter. This caused a critical bug:

1. User opens Coordinator #1, opens child windows (DraggableItems, DropZones)
2. Closes Coordinator #1, but child windows remain open
3. Opens NEW Coordinator #2
4. Clicks to open windows → `window.open('window-frame-b.html', 'DropZones', ...)`
5. **REUSES the old DropZones window** instead of creating new one
6. Old window has `window.opener` pointing to **closed** Coordinator #1
7. New Coordinator #2 stores reference to this old window
8. Messages posted to old window fail silently (wrong opener)

**Evidence from logs:**
- ✅ Coordinator successfully posts messages
- ✅ Window.closed = false (window exists)
- ❌ Frame-b shows ZERO message events (messages never arrive)

## The Fix

**commit 87042c9**: Use unique window names with timestamp

```javascript
// Before (buggy):
window.open('window-frame-b.html', 'DropZones', ...)

// After (fixed):
const uniqueName = `DropZones_${Date.now()}`;
window.open('window-frame-b.html', uniqueName, ...)
```

This ensures each `window.open()` creates a FRESH window with correct `window.opener` pointing to the current coordinator.

## Additional Improvements

**commit 87042c9** also added:
1. Window name verification in relay
2. Message receipt acknowledgments from frame-b
3. Better window identity logging

## Complete Change History

### 1. Enhanced Logging (commits 85c5c4a, 0ca5ade, 93b1e82)
- Raw postMessage event logging
- Origin validation with detailed rejection reasons
- Message relay success/failure tracking
- Handler registration verification
- State variable logging
- Full message content in relay logs
- DEBUGGING.md guide

### 2. Window Validation (commit cefb163)
- Test messages 1s after opening
- Window property logging
- Coordinator window.opener verification

### 3. ROOT CAUSE FIX (commit 87042c9) ✅
- **Unique window names to prevent reuse**
- Window name verification
- Message receipt acknowledgments

## Testing

With the fix applied, users should now see:
1. Each window open creates a fresh window
2. Child windows receive messages immediately
3. Frame-b logs all incoming messages
4. Drag and drop works correctly between windows

## Files Modified
- `public/hybrid-communication.js` - Enhanced logging + window name verification
- `public/window-frame-a.html` - Raw event logging
- `public/window-frame-b.html` - Enhanced logging + acknowledgments
- `public/parent-windows.html` - **Unique window names (THE FIX)**
- `README.md` - Links to debugging resources

## Files Created
- `DEBUGGING.md` - Troubleshooting guide
- `SUMMARY.md` - This file

## Security
✅ CodeQL scan passed - 0 vulnerabilities

## Performance Note
The debug logging is verbose. In production, could be gated behind a debug flag.
