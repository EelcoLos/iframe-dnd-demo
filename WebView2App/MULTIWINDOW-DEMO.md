# Multi-Window Table Demo with Web Components

## Overview

This new feature adds a complete multi-window drag-and-drop table demonstration using modern Web Components architecture to the WebView2 application.

## What Was Added

### Web Components Architecture

**Custom Elements**:
- `<table-row>` - Reusable table row component with drag support
- `<drag-drop-table>` - Complete table with drag & drop capabilities

**Features**:
- Shadow DOM encapsulation
- Custom event-based communication
- Reactive data binding
- Automatic total calculations

### User Interface

**Coordinator Window**:
```
┌─────────────────────────────────────────────┐
│  Multi-Window Table Demo                    │
│                                              │
│  Instructions:                               │
│  1. Click buttons to open table windows     │
│  2. Arrange windows side-by-side            │
│  3. Drag rows between windows               │
│  4. Use Ctrl+C/V for keyboard copy/paste    │
│                                              │
│  [📋 Available Items] [🏗️ Construction Calc]│
│                                              │
│  Window Status:                              │
│  ● Available Items    ● Construction Calc   │
└─────────────────────────────────────────────┘
```

**Available Items Window** (Source):
```
┌────────────────────────────────────────────┐
│  Available Construction Items               │
├────────────────────────────────────────────┤
│  Description      Qty    Price    Amount   │
│  ────────────────────────────────────────  │
│  Concrete Found   50    $120.00   $6000    │ ←─┐
│  Steel Beams      25    $450.00  $11250    │   │ Drag
│  Wooden Frames   100     $85.00   $8500    │   │
│  Roof Tiles      200     $35.00   $7000    │ ←─┘
│  ...                                        │
├────────────────────────────────────────────┤
│  Total:                        $47,500.00  │
└────────────────────────────────────────────┘
```

**Construction Calc Window** (Target):
```
┌────────────────────────────────────────────┐
│  Construction Calculation                   │
├────────────────────────────────────────────┤
│  Description      Qty    Price    Amount   │
│  ────────────────────────────────────────  │
│  [Drop rows here]                          │ ←─ Drop here!
│                                             │
│                                             │
├────────────────────────────────────────────┤
│  Total:                             $0.00  │
└────────────────────────────────────────────┘
```

## How to Use

### Opening the Demo

1. Launch the WebView2 application
2. Click the **"🚀 Multi-Window"** button in the toolbar
3. A coordinator window opens

### Opening Table Windows

From the coordinator window:
1. Click **"📋 Available Items"** - Opens source table
2. Click **"🏗️ Construction Calc"** - Opens target table
3. Arrange windows side-by-side on your desktop

### Drag and Drop

**Mouse**:
1. Click and hold on any row in Available Items
2. Drag the row to the Construction Calc window
3. Release to drop
4. Watch the total update automatically!

**Keyboard**:
1. Click a row in Available Items to select it (blue outline)
2. Press **Ctrl+C** to copy
3. Focus the Construction Calc window (click on it)
4. Press **Ctrl+V** to paste
5. Row appears in the target table

## Technical Implementation

### Web Components Structure

```javascript
// table-row-component.js
class TableRow extends HTMLElement {
  - Shadow DOM for encapsulation
  - Data binding for row properties
  - Drag event handlers
  - Copy/paste support
  - Visual feedback (selected, copied states)
}

// drag-drop-table-component.js
class DragDropTable extends HTMLElement {
  - Container for table rows
  - Total calculation
  - Row management (add/remove)
  - Custom event dispatching
  - Keyboard event handling
}
```

### Cross-Window Communication

```
Source Window (Available Items)
    ↓
  Drag starts → broadcast('dragStartTable')
    ↓
Coordinator relays via HybridCommunicationManager
    ↓
Target Window (Construction Calc) receives
    ↓
  Drop → addRow() → updateTotal()
```

### WebView2 Integration

```csharp
// MultiWindowCoordinator.xaml.cs
- CoreWebView2.NewWindowRequested event
- Automatic window positioning
- Virtual host mapping for each window
- BroadcastChannel relay support
```

## Code Examples

### Using the Table Component

```html
<drag-drop-table 
  id="my-table" 
  title="My Table" 
  can-drop>
</drag-drop-table>

<script type="module">
  import './drag-drop-table-component.js';
  
  const table = document.getElementById('my-table');
  
  // Set data
  table.rows = [
    { description: 'Item 1', quantity: 10, unitPrice: 50, amount: 500 }
  ];
  
  // Listen for events
  table.addEventListener('table-drag-start', (e) => {
    console.log('Drag started:', e.detail.data);
  });
</script>
```

### Custom Row Component

```html
<table-row 
  description="Concrete" 
  quantity="50" 
  unit-price="120" 
  amount="6000"
  draggable>
</table-row>
```

## Benefits

### For Users
- ✅ Multi-monitor support (windows can be on different screens)
- ✅ Keyboard shortcuts for power users
- ✅ Real-time calculation updates
- ✅ Visual feedback during interactions

### For Developers
- ✅ **Reusable Components**: Can be used in any web project
- ✅ **Shadow DOM**: No style conflicts
- ✅ **Modern Standards**: Web Components are a W3C standard
- ✅ **Easy Integration**: Works with any framework (or none!)
- ✅ **Type Safety**: Can be enhanced with TypeScript

## File Structure

```
public/
├── table-row-component.js           # Custom <table-row> element
├── drag-drop-table-component.js     # Custom <drag-drop-table> element
├── webcomponent-table-source.html   # Available Items window
├── webcomponent-table-target.html   # Construction Calc window
└── webview2-multiwindow-coordinator.html  # Coordinator window

WebView2App/
├── MultiWindowCoordinator.xaml      # Coordinator window UI
└── MultiWindowCoordinator.xaml.cs   # Window opening logic
```

## Comparison with Other Demos

| Feature | Basic Items | Table Rows | HTML5 DnD | Multi-Window (NEW) |
|---------|-------------|------------|-----------|-------------------|
| Technology | Pointer Events | Pointer Events | HTML5 API | **Web Components** |
| Windows | 1 (split) | 1 (split) | 1 (split) | **Multiple** |
| Drag Method | Custom | Custom | Native | **Component Events** |
| Modularity | Low | Medium | Low | **High (reusable)** |
| Modern | ✓ | ✓ | ✓ | **✓✓ (cutting edge)** |

## Why Web Components?

1. **Standards-Based**: Part of the HTML Living Standard
2. **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS
3. **Encapsulation**: Shadow DOM prevents style/script conflicts
4. **Reusability**: Write once, use anywhere
5. **Future-Proof**: Native browser support, no polyfills needed
6. **Performance**: No virtual DOM overhead

## Browser Support

Web Components are supported in:
- ✅ Chrome/Edge 67+
- ✅ Firefox 63+
- ✅ Safari 10.1+
- ✅ Opera 54+

Perfect for WebView2 which uses Chromium-based Edge!

## Next Steps

This implementation can be extended with:

- [ ] Drag multiple rows at once
- [ ] Undo/redo support
- [ ] Data persistence (save/load)
- [ ] Export to CSV/Excel
- [ ] More table operations (sort, filter)
- [ ] TypeScript definitions
- [ ] Unit tests for components
- [ ] Storybook documentation

## Try It!

1. Build the WebView2 app: `dotnet build`
2. Run: `dotnet run`
3. Click "🚀 Multi-Window"
4. Open both table windows
5. Start dragging rows between windows!

Enjoy the modern Web Components architecture! 🎉
