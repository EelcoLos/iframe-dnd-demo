# WebView2 App Features Overview

## 🎨 What's Included

This WebView2 application brings together **all** the drag-and-drop demonstrations from the iframe-dnd-demo repository into a single native Windows application.

## 📊 Demo Modes Comparison

| Feature | Basic Items | Table Rows | HTML5 DnD |
|---------|-------------|------------|-----------|
| **Drag & Drop** | ✅ Custom Pointer Events | ✅ Custom Pointer Events | ✅ HTML5 API |
| **Visual Feedback** | ✅ Hover highlights | ✅ Drop indicators | ✅ Native drag image |
| **Animations** | ✅ Success animations | ✅ Row animations | ✅ CSS transitions |
| **Data Transfer** | Item objects | Row data + calculations | DataTransfer API |
| **Keyboard Support** | ❌ | ✅ Copy/Paste (Ctrl+C/V) | ❌ |
| **Multiple Items** | ✅ One at a time | ✅ One row at a time | ✅ One at a time |
| **Auto Calculations** | ❌ | ✅ Real-time totals | ❌ |
| **Use Case** | Task management | Budget planning | Generic DnD |

## 🎮 Application Features

### Window Management

- **Native Windows UI**: Standard title bar, menu bar, and status bar
- **Responsive Layout**: Resizable window with GridSplitter
- **Modern Design**: Windows 11-style interface with rounded corners and shadows

### Layout Options

#### Horizontal Layout (Default)
```
┌─────────────────────────────────────┐
│  [WebView #1]  │  [WebView #2]      │
│                │                    │
│                │                    │
└─────────────────────────────────────┘
```

#### Vertical Layout
```
┌─────────────────────────────────────┐
│          [WebView #1]               │
│─────────────────────────────────────│
│          [WebView #2]               │
└─────────────────────────────────────┘
```

### Navigation Controls

- **Back/Forward**: Navigate browser history in both WebViews simultaneously
- **Refresh**: Reload both WebViews (useful when developing)
- **Individual Refresh**: Each WebView has its own refresh button
- **DevTools**: Open Edge DevTools for debugging web content

### Status Information

- **Runtime Version**: Shows installed WebView2 Runtime version
- **Status Messages**: Real-time feedback on actions
- **Active Indicators**: Visual indicators showing WebView state

## 🔧 Technical Features

### WebView2 Integration

- **Dual WebView2 Controls**: Two independent browser instances
- **Virtual Host Mapping**: Serves local files via `https://app.local/`
- **Shared Origin**: Both WebViews share the same origin for communication
- **DevTools Support**: Full Chrome DevTools for each WebView

### Communication Architecture

- **postMessage Protocol**: WebViews communicate via JavaScript postMessage
- **Parent Coordination**: Parent window coordinates drag-and-drop operations
- **Coordinate Translation**: Automatic conversion between WebView coordinate systems
- **Event Propagation**: Proper event handling across boundaries

### Performance

- **Efficient Rendering**: Hardware-accelerated rendering via Chromium
- **Lazy Loading**: Content loads on demand
- **Resource Optimization**: Shared resources between WebViews where possible

## 📦 Distribution Features

### Build Configurations

- **Debug Build**: With symbols for debugging
- **Release Build**: Optimized for performance
- **Self-Contained**: Includes .NET runtime (no installation required)
- **Single File**: Optional single-file executable

### Deployment Options

1. **Framework-Dependent**: Small size, requires .NET 8.0 installed
2. **Self-Contained**: Larger size, works without .NET installed
3. **Single File**: Everything in one executable

## 🎯 Demo-Specific Features

### Basic Items Demo

**Visual Elements**:
- 6 colorful draggable items (Red, Blue, Green, Yellow, Purple, Orange)
- 3 drop zones with distinct colors
  - To Do (coral/salmon)
  - In Progress (blue/purple)
  - Done (green)

**Interactions**:
- Click and drag any item
- Hover over drop zones for visual feedback
- Drop to add item to zone
- Success animation on drop

### Table Rows Demo

**Visual Elements**:
- Construction Calculation table (left)
- Candidate Rows table (right)
- Editable fields (description, quantity, unit price)
- Auto-calculated totals

**Interactions**:
- Drag rows between tables
- Click row to select (shows blue border)
- Ctrl+C to copy selected row
- Ctrl+V to paste in other table
- Automatic total recalculation
- Visual feedback during drag

**Calculations**:
- Row Amount = Quantity × Unit Price
- Table Total = Sum of all row amounts
- Updates in real-time

### HTML5 DnD Demo

**Visual Elements**:
- Items with native drag handles
- Drop zones with dashed borders
- Standard browser drag preview

**Interactions**:
- Uses native HTML5 Drag & Drop API
- Standard browser drag image
- DataTransfer object for data exchange
- Native drop effects (copy, move, link)

## 🚀 Advantages Over Web Version

| Aspect | Web Version | WebView2 App |
|--------|-------------|--------------|
| **Installation** | No installation needed | One-time install |
| **Offline Use** | Requires server | Works offline |
| **Performance** | Browser overhead | Native performance |
| **Integration** | Limited | Full Windows integration |
| **DevTools** | Browser DevTools | Embedded DevTools |
| **Distribution** | URL sharing | Executable file |
| **Updates** | Automatic | Manual or auto-update |
| **Security** | Browser sandboxed | App permissions |

## 🎓 Learning Opportunities

This application demonstrates:

1. **WebView2 Integration**: How to embed web content in native apps
2. **WPF Modern UI**: Creating modern Windows applications
3. **Hybrid Development**: Combining web and native technologies
4. **Virtual Hosting**: Serving local files securely
5. **Cross-Context Communication**: WebView to WebView messaging
6. **Event Coordination**: Managing complex user interactions
7. **.NET 8 Features**: Modern C# and .NET capabilities

## 🔮 Future Possibilities

Potential enhancements:

- [ ] Save/Load state to local storage
- [ ] Custom themes (dark mode)
- [ ] More demo modes (file upload, image gallery, etc.)
- [ ] Multi-window support (separate windows like cross-window demo)
- [ ] Native drag-and-drop from Windows Explorer
- [ ] Settings dialog for customization
- [ ] Export functionality (save data to file)
- [ ] Auto-update mechanism
- [ ] Telemetry and analytics
- [ ] Accessibility improvements (screen reader support)

## 📋 System Requirements

### Minimum Requirements

- **OS**: Windows 10 version 1803 (April 2018 Update) or later
- **RAM**: 4 GB
- **Disk**: 100 MB for app + 100 MB for WebView2 Runtime
- **Display**: 1024x768 or higher

### Recommended Requirements

- **OS**: Windows 11
- **RAM**: 8 GB or more
- **Disk**: SSD for better performance
- **Display**: 1920x1080 or higher

### Software Requirements

- **.NET 8.0 Runtime** (or included with self-contained build)
- **WebView2 Runtime** (usually pre-installed on Windows 10/11)

## 🆘 Getting Help

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md)
- **Building**: See [README.md](README.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: https://github.com/EelcoLos/iframe-dnd-demo/issues
- **WebView2 Docs**: https://learn.microsoft.com/microsoft-edge/webview2/

---

*Enjoy exploring drag-and-drop in a native Windows application!* 🎯
