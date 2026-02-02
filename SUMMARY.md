# Summary: Cross-Window Drag & Drop Debugging

## Problem Statement
User reported: "The console is showing messages being relayed from frame-a to frame-b, but nothing's visible on the second one (frame-b)"

## What Was Done

### 1. Enhanced Logging (3 commits)

**Commit 85c5c4a**: Added comprehensive debug logging
- Raw postMessage event logging in both child windows
- Origin validation with detailed rejection reasons
- Message relay success/failure logging
- Full message content in relay logs

**Commit 0ca5ade**: Added handler invocation tracking
- Logging in frame-b's dragStart/dragEnd handlers
- State variable logging (isDragActive, etc.)
- Drop condition verification
- Handler registration verification in processMessage

**Commit 93b1e82**: Added debugging guide
- Created DEBUGGING.md with complete troubleshooting steps
- Expected log sequences
- Common issues and solutions
- Testing procedures

### 2. What the Logs Will Reveal

The enhanced logging will show exactly where the message flow breaks:

**Possible Issue #1: Messages Not Delivered**
- Symptom: No `[frame-b DEBUG] Received raw message event` logs
- Cause: Window reference invalid or closed
- Fix: Check coordinator's window.open() result

**Possible Issue #2: Origin Mismatch**
- Symptom: `rejected message from wrong origin` warning
- Cause: Different protocols/ports between windows  
- Fix: Ensure all windows on same origin

**Possible Issue #3: Handlers Not Registered**
- Symptom: `NO handlers registered for message type` warning
- Cause: Timing issue - handlers registered after messages arrive
- Fix: Ensure broadcast.on() called immediately after init

**Possible Issue #4: dragStart Not Received**
- Symptom: `Ignoring dragEnd because isDragActive is false`
- Cause: dragStart message never arrived or was rejected
- Fix: Check dragStart message flow in logs

**Possible Issue #5: Drop Conditions Not Met**
- Symptom: `Not dropping - isMouseOverWindow: false`
- Cause: Mouse not over frame-b when drag ended
- Fix: This is expected - user must drag TO frame-b

### 3. How to Use

1. Open all 3 windows (Coordinator, frame-a, frame-b)
2. Open console (F12) in ALL windows
3. Drag an item in frame-a
4. Watch logs in all consoles simultaneously
5. Compare actual logs with expected sequence in DEBUGGING.md
6. Identify which log is missing
7. Apply fix based on failure point

### 4. Expected Log Sequence (Success)

When working correctly, you should see:

```
[frame-a] broadcasting: dragStart
↓
[Coordinator] received dragStart from frame-a
↓
[Coordinator] Relaying to frame-b
↓
[frame-b DEBUG] Received raw message event
↓
[frame-b] received via postMessage: dragStart
↓
[frame-b] processing message type="dragStart"
↓
[frame-b] found 1 handler(s) for type "dragStart"
↓
[frame-b] dragStart handler called, isDragActive: true
```

If any of these steps is missing, that's where the problem is.

## Next Steps

**For the User:**
1. Test with the enhanced logging
2. Share console output from all 3 windows
3. Identify which step fails
4. Report findings

**For the Developer:**
Once we know where it fails, we can apply the appropriate fix:
- If messages not delivered → Fix window reference
- If origin rejected → Fix origin handling
- If handlers not registered → Fix timing
- If dragStart missing → Fix message relay
- If drop conditions not met → User education (expected behavior)

## Files Modified

- `public/hybrid-communication.js` - Enhanced logging throughout
- `public/window-frame-a.html` - Raw event logging
- `public/window-frame-b.html` - Raw event logging + handler logging
- `DEBUGGING.md` - Comprehensive troubleshooting guide

## Files Created

- `DEBUGGING.md` - Step-by-step debugging guide

## Security

✅ CodeQL scan passed - 0 vulnerabilities
✅ All logging uses safe string interpolation
✅ Origin validation still enforced

## Performance Note

The debug logging is verbose and may impact performance slightly. In production, these logs could be gated behind a debug flag. For now, they're essential for diagnosing the issue.
