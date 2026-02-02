# Cross-Window Drag & Drop: Implementation Comparison

This document compares the two approaches for cross-window drag and drop in this demo.

## Quick Recommendation

**Use HTML5 Drag & Drop API** (default) unless you need custom drag preview styling.

## Implementation Comparison

### HTML5 Drag & Drop API (Recommended)

**Files:** `window-frame-a-html5.html`, `window-frame-b-html5.html`

**Pros:**
- ✅ **Simpler code** - ~60% less JavaScript than custom implementation
- ✅ **Native browser API** - Standard web platform feature
- ✅ **Cross-window support** - dataTransfer works between same-origin windows
- ✅ **Browser-handled visuals** - Automatic drag ghost/preview
- ✅ **Better for learning** - Shows proper use of web APIs
- ✅ **Easier to maintain** - Less custom code to debug
- ✅ **Good performance** - Native implementation is optimized

**Cons:**
- ❌ **Limited visual customization** - Browser controls drag preview appearance
- ❌ **Browser-specific differences** - Firefox vs Chrome ghost images may differ
- ❌ **dataTransfer limitations** - Only serializable data (strings, JSON)

**How It Works:**
```html
<!-- Source window -->
<div class="item" draggable="true" data-text="My Item">
  🎨 My Item
</div>

<script>
item.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('application/json', JSON.stringify({
    id: '1',
    text: 'My Item'
  }));
});
</script>

<!-- Target window -->
<div class="drop-zone">
  <div class="zone-header">Drop Here</div>
</div>

<script>
zone.addEventListener('dragover', (e) => {
  e.preventDefault(); // Allow drop
  e.dataTransfer.dropEffect = 'move';
});

zone.addEventListener('drop', (e) => {
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData('application/json'));
  // Add item to zone
});
</script>
```

**Best For:**
- General web applications
- Learning drag and drop
- Quick prototypes
- Standard workflows

---

### Custom Pointer Events (Advanced)

**Files:** `window-frame-a.html`, `window-frame-b.html`, `hybrid-communication.js`

**Pros:**
- ✅ **Full control** - Custom drag preview styling
- ✅ **Consistent visuals** - Same appearance across all browsers
- ✅ **Complex data** - Can pass any JavaScript objects via messaging
- ✅ **Fine-grained feedback** - Custom hover states, animations
- ✅ **Educational** - Shows low-level drag mechanics
- ✅ **Framework building** - Base for custom libraries

**Cons:**
- ❌ **More complex** - ~2.5x more code than HTML5 version
- ❌ **More to maintain** - Custom event handling, coordinate conversion
- ❌ **Performance overhead** - JavaScript-based preview positioning
- ❌ **Requires messaging** - BroadcastChannel/postMessage complexity

**How It Works:**
```javascript
// Source window - track pointer events
item.addEventListener('pointerdown', (e) => {
  draggedElement = item;
  dragData = { id: '1', text: 'My Item' };
  
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
});

function handlePointerMove(e) {
  // Broadcast movement to other windows
  broadcast.broadcast('dragMove', {
    ...dragData,
    screenX: e.screenX,
    screenY: e.screenY
  });
}

// Target window - show preview at cursor
broadcast.on('dragMove', (data) => {
  const localX = data.screenX - window.screenX;
  const localY = data.screenY - window.screenY;
  
  dragPreview.style.left = localX + 'px';
  dragPreview.style.top = localY + 'px';
  dragPreview.classList.add('visible');
});
```

**Best For:**
- Custom design systems
- Framework/library authors
- Precise visual requirements
- Educational deep-dives

---

## Feature Comparison Table

| Feature | HTML5 DnD API | Custom Pointer Events |
|---------|---------------|----------------------|
| **Lines of Code** | ~150 | ~400 |
| **Complexity** | Low | Medium-High |
| **Browser API** | Native DnD | Pointer Events + Messaging |
| **Cross-Window** | ✅ Native support | ✅ Via BroadcastChannel/postMessage |
| **Drag Preview** | Browser default | Custom styled element |
| **Visual Consistency** | Varies by browser | Identical everywhere |
| **Data Transfer** | dataTransfer (serialized) | postMessage (any data) |
| **Performance** | Native (fast) | JavaScript (good) |
| **Maintenance** | Easy | More effort |
| **Learning Curve** | Gentle | Steep |
| **Best For** | Most use cases | Custom requirements |

---

## Technical Details

### HTML5 DataTransfer API

**What Gets Transferred:**
- Text: `e.dataTransfer.setData('text/plain', 'Hello')`
- JSON: `e.dataTransfer.setData('application/json', '{...}')`
- HTML: `e.dataTransfer.setData('text/html', '<div>...</div>')`
- URLs: `e.dataTransfer.setData('text/uri-list', 'https://...')`

**Cross-Window Reliability:**
- ✅ Same browser, same origin: Excellent
- ✅ `text/plain`: Most compatible MIME type
- ✅ `application/json`: Works reliably
- ⚠️ Custom MIME types: Browser-dependent
- ❌ Different browsers: Not supported

**Events:**
- `dragstart` - User starts dragging
- `drag` - Fires continuously during drag
- `dragenter` - Cursor enters drop zone
- `dragover` - Cursor over drop zone (must preventDefault)
- `dragleave` - Cursor leaves drop zone
- `drop` - User releases in drop zone
- `dragend` - Drag operation ends

### Custom Implementation Details

**Communication Methods:**

1. **BroadcastChannel** (Chrome, Edge, Safari)
   - Same-origin, all tabs/windows
   - Fastest, simplest
   - May be partitioned by Firefox ETP

2. **postMessage** (Fallback for Firefox)
   - Requires window.opener reference
   - Coordinator relays messages
   - Slightly more latency

**Coordinate Conversion:**
```javascript
// Screen coordinates are global across all windows
const screenX = pointerEvent.screenX;
const screenY = pointerEvent.screenY;

// Convert to window-local coordinates
const windowX = window.screenLeft || window.screenX;
const windowY = window.screenTop || window.screenY;

const localX = screenX - windowX;
const localY = screenY - windowY;
```

---

## Migration Guide

### From Custom to HTML5

**Before (Custom):**
```javascript
item.addEventListener('pointerdown', (e) => {
  // 50+ lines of custom logic...
});
```

**After (HTML5):**
```html
<div draggable="true" data-id="1">Item</div>

<script>
item.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('application/json', 
    JSON.stringify({ id: item.dataset.id }));
});
</script>
```

**Benefits:**
- 90% less code
- Standard API
- Browser-optimized
- Cross-window works automatically

### From HTML5 to Custom

**When you need:**
- Specific drag preview styling
- Identical visuals across browsers
- Complex non-serializable data
- Custom drag behavior

**Migration steps:**
1. Add pointer event handlers
2. Implement custom preview element
3. Set up BroadcastChannel/postMessage
4. Handle coordinate conversion
5. Test across browsers

---

## Recommendation Decision Tree

```
Do you need custom drag preview styling?
├─ No → Use HTML5 Drag & Drop API ✅
└─ Yes
   └─ Can you work with browser default ghost images?
      ├─ Yes → Use HTML5 Drag & Drop API ✅
      └─ No → Use Custom Pointer Events Implementation
```

**In most cases: HTML5 Drag & Drop API is the right choice!**

---

## References

- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [MDN: DataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer)
- [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [MDN: BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [web.dev: DataTransfer API](https://web.dev/articles/datatransfer)
- [Can I Use: Drag and Drop](https://caniuse.com/dragndrop)
