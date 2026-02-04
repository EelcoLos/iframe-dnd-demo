# Web Components Multi-Window Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WebView2 Main Application                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Main Window                                 │ │
│  │  [Basic Items] [Table Rows] [HTML5] [🚀 Multi-Window] ←──────┐ │ │
│  │                                                                │ │ │
│  │  ┌────────────────┐        ┌────────────────┐                │ │ │
│  │  │  WebView2 #1   │        │  WebView2 #2   │                │ │ │
│  │  └────────────────┘        └────────────────┘                │ │ │
│  └──────────────────────────────────────────────────┬────────────┘ │ │
│                                                      │              │ │
│                                      Click Multi-Window Button     │ │
│                                                      ↓              │ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Multi-Window Coordinator                           │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  WebView2 (Coordinator)                                   │  │ │
│  │  │  https://app.local/webview2-multiwindow-coordinator.html  │  │ │
│  │  │                                                            │  │ │
│  │  │  [📋 Open Available Items] [🏗️ Open Construction Calc]   │  │ │
│  │  │                                                            │  │ │
│  │  │  Status:  ● Available Items    ● Construction Calc        │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│           │                                    │                     │
│           │ NewWindowRequested                 │ NewWindowRequested  │
│           ↓                                    ↓                     │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │  New WPF Window     │           │  New WPF Window     │          │
│  │  ┌───────────────┐  │           │  ┌───────────────┐  │          │
│  │  │ WebView2      │  │           │  │ WebView2      │  │          │
│  │  │ (Source)      │  │           │  │ (Target)      │  │          │
│  │  │               │  │           │  │               │  │          │
│  │  │ webcomponent- │  │           │  │ webcomponent- │  │          │
│  │  │ table-source  │  │           │  │ table-target  │  │          │
│  │  └───────────────┘  │           │  └───────────────┘  │          │
│  └─────────────────────┘           └─────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

## Web Components Structure

```
┌─────────────────────────────────────────────────────────────┐
│              <drag-drop-table> Component                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Shadow DOM                           │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  <table>                                          │  │ │
│  │  │    <thead>                                        │  │ │
│  │  │      Description | Quantity | Price | Amount      │  │ │
│  │  │    </thead>                                       │  │ │
│  │  │    <tbody>                                        │  │ │
│  │  │      <table-row> ┐                                │  │ │
│  │  │        ├─ Shadow DOM                              │  │ │
│  │  │        ├─ data: { description, qty, price }       │  │ │
│  │  │        ├─ @row-drag-start                         │  │ │
│  │  │        └─ @row-select                             │  │ │
│  │  │      </table-row>                                 │  │ │
│  │  │      <table-row>...</table-row>                   │  │ │
│  │  │    </tbody>                                       │  │ │
│  │  │    <tfoot>                                        │  │ │
│  │  │      Total: $X,XXX.XX                             │  │ │
│  │  │    </tfoot>                                       │  │ │
│  │  │  </table>                                         │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  Methods:                                               │ │
│  │    - addRow(data)                                       │ │
│  │    - removeRow(data)                                    │ │
│  │    - updateTotal()                                      │ │
│  │                                                         │ │
│  │  Events Emitted:                                        │ │
│  │    - table-drag-start                                   │ │
│  │    - row-copied                                         │ │
│  │    - row-pasted                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Communication Flow

```
┌──────────────────────┐
│  Source Window       │
│  (Available Items)   │
│                      │
│  User drags row ────┼──→ row-drag-start event
│  ↓                   │        ↓
│  <table-row>         │   CustomEvent bubbles
│  ↓                   │        ↓
│  <drag-drop-table>   │   table-drag-start event
│  ↓                   │        ↓
│  JavaScript          │   broadcast.broadcast('dragStartTable', data)
└──────────────────────┘        ↓
                                │
                    ┌───────────┴──────────────┐
                    │                          │
          ┌─────────▼─────────┐   ┌───────────▼──────────┐
          │ BroadcastChannel  │   │ postMessage (Firefox)│
          │ (Chrome/Edge)     │   │                      │
          └─────────┬─────────┘   └───────────┬──────────┘
                    │                         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  HybridCommunication     │
                    │  Manager (Coordinator)   │
                    │  - Relays messages       │
                    │  - Manages windows       │
                    └───────────┬──────────────┘
                                │
                                ↓
┌──────────────────────────────────────────────┐
│  Target Window                               │
│  (Construction Calc)                         │
│                                              │
│  broadcast.on('dragStartTable') ────────────┼──→ Setup drop listeners
│  ↓                                           │        ↓
│  document.addEventListener('dragover')       │   Allow drop
│  document.addEventListener('drop')           │        ↓
│  ↓                                           │   Drop event fires
│  table.addRow(data) ─────────────────────────┼──→ Add to table
│  ↓                                           │        ↓
│  table.updateTotal() ────────────────────────┼──→ Recalculate
│  ↓                                           │        ↓
│  UI updates                                  │   Visual update
└──────────────────────────────────────────────┘
```

## Event Flow Detail

```
1. Mouse Down on Row
   ↓
2. Mouse Move > 5px
   ↓
3. CustomEvent('row-drag-start')
   ↓
4. Bubbles to <drag-drop-table>
   ↓
5. CustomEvent('table-drag-start')
   ↓
6. JavaScript catches event
   ↓
7. broadcast.broadcast('dragStartTable', {
     data: rowData,
     sourceWindow: 'source-table-webcomponent'
   })
   ↓
8. Message travels via BroadcastChannel/postMessage
   ↓
9. Coordinator receives and relays
   ↓
10. Target window receives
    ↓
11. Sets up drop listeners
    ↓
12. User releases mouse over target
    ↓
13. Drop event fires
    ↓
14. table.addRow(data)
    ↓
15. Component re-renders
    ↓
16. table.updateTotal()
    ↓
17. Visual update complete!
```

## WebView2 Integration

```
C# WPF Application
├── Main Window
│   └── Click "Multi-Window" button
│       ↓
├── MultiWindowCoordinator Window Created
│   ├── WebView2 initialized
│   ├── Virtual host: app.local → public/
│   └── Navigate to coordinator.html
│       ↓
│       User clicks "Open Available Items"
│       ↓
│       CoreWebView2.NewWindowRequested event
│       ↓
├── New WPF Window Created (Source)
│   ├── Position: Left: 100, Top: 100
│   ├── Size: 900x700
│   ├── WebView2 added
│   ├── Virtual host mapped
│   └── Navigate to source.html
│       ↓
│       Loads Web Components
│       ↓
│       <drag-drop-table> initialized
│       ↓
│       Sample data loaded
│
│       User clicks "Open Construction Calc"
│       ↓
│       CoreWebView2.NewWindowRequested event
│       ↓
└── New WPF Window Created (Target)
    ├── Position: Left: 1020, Top: 100
    ├── Size: 900x700
    ├── WebView2 added
    ├── Virtual host mapped
    └── Navigate to target.html
        ↓
        Loads Web Components
        ↓
        <drag-drop-table can-drop> initialized
        ↓
        Empty table ready for drops
```

## Data Flow

```
Source Table Row Data:
{
  description: "Concrete Foundation",
  quantity: 50,
  unitPrice: 120.00,
  amount: 6000.00
}
    ↓
Serialized in dragStart event
    ↓
Broadcast via HybridCommunicationManager
    ↓
Received in target window
    ↓
Deserialized back to object
    ↓
table.addRow(data)
    ↓
Component creates new <table-row>
    ↓
Sets attributes from data
    ↓
Shadow DOM renders
    ↓
Total recalculated
    ↓
Visual update!
```

## Key Technologies

1. **Web Components** (Custom Elements v1)
   - Reusable, encapsulated components
   - Shadow DOM for style isolation
   - Custom events for communication

2. **HybridCommunicationManager**
   - BroadcastChannel API (Chrome/Edge)
   - postMessage fallback (Firefox)
   - Automatic window tracking

3. **WebView2**
   - Chromium-based browser control
   - NewWindowRequested for popups
   - Virtual host mapping
   - Native window management

4. **WPF**
   - Native Windows UI
   - Window positioning
   - Event handling
   - Resource management

## Benefits

✅ **Modular**: Components can be reused in any project
✅ **Maintainable**: Clear separation of concerns
✅ **Scalable**: Easy to add more features
✅ **Standard**: Based on W3C Web Components spec
✅ **Cross-browser**: Works in all modern browsers
✅ **Performance**: Native browser implementation
✅ **Type-safe**: Can add TypeScript definitions

## Summary

This architecture demonstrates:
- Modern web development with Web Components
- Multi-window desktop application patterns
- Cross-window communication strategies
- WebView2 integration best practices
- Reusable component design
- Event-driven architecture

Perfect for building hybrid desktop applications! 🚀
