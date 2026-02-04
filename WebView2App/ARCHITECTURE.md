# WebView2 Application Architecture

## Overview

This application demonstrates how to integrate web-based drag-and-drop functionality within a native Windows application using Microsoft's WebView2 control.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WPF Application                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MainWindow (WPF)                         │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐    │  │
│  │  │   WebView2 #1       │  │   WebView2 #2       │    │  │
│  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │    │  │
│  │  │  │  frame-a.html │  │  │  │  frame-b.html │  │    │  │
│  │  │  │  (Draggables) │  │  │  │  (Drop Zones) │  │    │  │
│  │  │  └───────────────┘  │  │  └───────────────┘  │    │  │
│  │  │                     │  │                     │    │  │
│  │  │  Uses:              │  │  Uses:              │    │  │
│  │  │  - Pointer Events   │  │  - elementFromPoint │    │  │
│  │  │  - postMessage      │  │  - postMessage      │    │  │
│  │  └─────────────────────┘  └─────────────────────┘    │  │
│  │                                                       │  │
│  │  Communication via iframe-communication.js module    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Virtual Host: https://app.local/ → public/ folder         │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. WPF Application Layer

**File**: `MainWindow.xaml` and `MainWindow.xaml.cs`

The native Windows application layer provides:
- Window chrome and title bar
- Toolbar with navigation controls
- Demo mode switching
- Layout management (horizontal/vertical)
- Status bar with runtime information

#### Key WPF Features Used:
- **Grid Layout**: Responsive layout with GridSplitter for resizing
- **Styles**: Modern button styles with hover effects
- **Data Binding**: Dynamic UI updates
- **Event Handlers**: Button clicks, navigation

### 2. WebView2 Controls

**Technology**: Microsoft.Web.WebView2 NuGet package

Two independent WebView2 controls host the web content:

```csharp
// Initialize WebView2 runtime
await WebView1.EnsureCoreWebView2Async(null);
await WebView2.EnsureCoreWebView2Async(null);

// Map virtual host to local folder
WebView1.CoreWebView2.SetVirtualHostNameToFolderMapping(
    "app.local", _publicFolderPath, 
    CoreWebView2HostResourceAccessKind.Allow);
```

#### Virtual Host Mapping

The app uses `SetVirtualHostNameToFolderMapping` to serve local HTML/JS files:

- **Virtual URL**: `https://app.local/frame-a.html`
- **Physical Path**: `{AppDirectory}/public/frame-a.html`
- **Benefit**: Proper CORS handling, secure context (HTTPS)

### 3. Web Content Layer

**Files**: All files in `../public/` directory

The web layer contains:
- HTML pages with drag-and-drop UI
- JavaScript modules for communication
- CSS for styling

#### Communication Flow

```javascript
// In frame-a.html (draggable items)
// Sends message to parent when drag starts
window.parent.postMessage({
  type: 'dragStart',
  frameId: 'frame-a',
  data: { id: '1', text: 'Item 1' }
}, window.location.origin);

// In parent context (iframe-communication.js)
// Receives message and coordinates drag
window.addEventListener('message', (event) => {
  if (event.data.type === 'dragStart') {
    // Track drag across both WebViews
    // Send updates to frame-b
  }
});

// In frame-b.html (drop zones)
// Receives drop messages
window.addEventListener('message', (event) => {
  if (event.data.type === 'parentDrop') {
    // Add item to drop zone
  }
});
```

## Drag-and-Drop Flow

### 1. Drag Start (WebView #1)

```
User clicks item
    ↓
Pointer Events (pointerdown, pointermove)
    ↓
Drag threshold reached (5px)
    ↓
Send 'dragStart' message to parent
    ↓
Parent creates visual preview
```

### 2. Drag Move (Parent Coordination)

```
Parent tracks pointermove
    ↓
Calculate position relative to WebView #2
    ↓
Send 'parentDragMove' to WebView #2
    ↓
WebView #2 uses elementFromPoint
    ↓
Highlight hovered drop zone
```

### 3. Drop (WebView #2)

```
User releases pointer (pointerup)
    ↓
Parent sends 'parentDrop' to WebView #2
    ↓
WebView #2 adds item to zone
    ↓
Animate success
    ↓
Parent clears drag state
```

## Key Technical Details

### Why Two WebView2 Controls?

Each WebView2 control acts like an embedded browser:
- Independent JavaScript context
- Separate DOM
- Own event loop
- Similar to iframes in traditional web pages

### Communication Between WebViews

The WebViews communicate via the `postMessage` API:
- Messages go through the parent window
- Parent coordinates the drag-and-drop operation
- Similar to cross-iframe communication in browsers

### Coordinate System Conversion

When dragging between WebViews, coordinates must be converted:

```csharp
// In WPF (if we needed custom handling):
// Point in WebView1 → Point in Window → Point in WebView2

// But the web content handles this via:
// iframe-communication.js uses getBoundingClientRect()
// to convert parent coordinates to iframe coordinates
```

### Virtual Hosting Benefits

Using virtual host mapping (`https://app.local/`) instead of `file://`:

✅ **Proper CORS**: Cross-origin policies work correctly
✅ **Secure Context**: APIs like Service Workers available
✅ **No File Path Issues**: No absolute path dependencies
✅ **Same-Origin**: Both WebViews share same origin

### File Distribution

The `.csproj` file includes:

```xml
<ItemGroup>
  <None Update="../public/**/*.*">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    <Link>public/%(RecursiveDir)%(Filename)%(Extension)</Link>
  </None>
</ItemGroup>
```

This copies all `public/` files to the build output directory.

## Demo Modes

### Basic Items Mode
- **WebView #1**: `frame-a.html` - Draggable colored items
- **WebView #2**: `frame-b.html` - Three drop zones (To Do, In Progress, Done)
- **Module**: `draggable-items-communication.js`, `drop-zones-communication.js`

### Table Rows Mode
- **WebView #1**: `frame-a-table.html` - Construction calculation table
- **WebView #2**: `frame-b-table.html` - Candidate rows table
- **Features**: Row drag, automatic calculations, keyboard copy/paste

### HTML5 DnD Mode
- **WebView #1**: `window-frame-a-html5.html` - HTML5 draggable items
- **WebView #2**: `window-frame-b-html5.html` - HTML5 drop zones
- **API**: Native HTML5 Drag & Drop API
- **Module**: `html5-window-communication.js`

## Performance Considerations

### WebView2 Initialization

WebView2 initialization is async:
```csharp
await WebView1.EnsureCoreWebView2Async(null);
```

Wait for initialization before:
- Setting virtual host mappings
- Navigating to pages
- Injecting scripts

### Resource Management

- WebView2 controls are heavy (each is a browser instance)
- Limit the number of WebView2 controls
- Use appropriate cache and data management
- Consider user data folder for persistent storage

### Event Handling

- Pointer events have high frequency
- Use throttling/debouncing when appropriate
- Leverage pointer capture for smooth tracking

## Extending the Application

### Adding New Demo Modes

1. Create HTML files in `../public/`
2. Add mode to `LoadDemoMode()` in `MainWindow.xaml.cs`
3. Add button to toolbar in `MainWindow.xaml`

### Adding More WebViews

1. Add `<wv2:WebView2>` control to XAML
2. Initialize in `InitializeAsync()`
3. Set virtual host mapping
4. Load content

### Custom C# ↔ JavaScript Communication

WebView2 supports advanced communication:

```csharp
// Execute JavaScript from C#
string result = await WebView1.CoreWebView2.ExecuteScriptAsync(
    "document.getElementById('myElement').textContent");

// Receive messages from JavaScript
WebView1.CoreWebView2.WebMessageReceived += (s, e) => {
    string message = e.WebMessageAsJson;
    // Handle message
};

// Send messages to JavaScript
WebView1.CoreWebView2.PostWebMessageAsString("Hello from C#");
```

## Security Considerations

### Virtual Host Security

Virtual host mapping grants file system access:
- Only map necessary directories
- Use `CoreWebView2HostResourceAccessKind.Allow` carefully
- Validate and sanitize any user input

### Content Security

- WebView2 runs with full browser capabilities
- Implement Content Security Policy (CSP) in HTML
- Validate all postMessage communication
- Use HTTPS virtual host (not HTTP)

### Data Storage

- WebView2 stores data in user data folder
- Consider privacy implications
- Implement proper cleanup on uninstall

## Deployment

### Requirements Distribution

When distributing the app, users need:
1. **.NET 8.0 Runtime** (or use self-contained deployment)
2. **WebView2 Runtime** (or use fixed version distribution)

### Self-Contained Deployment

```bash
dotnet publish -c Release \
  --self-contained \
  --runtime win-x64 \
  -p:PublishSingleFile=true
```

This creates a single `.exe` with:
- Embedded .NET runtime
- All dependencies
- Requires WebView2 Runtime installed on target

### Fixed Version WebView2

For maximum compatibility, distribute WebView2 Runtime with your app.

## Resources

- [WebView2 Documentation](https://learn.microsoft.com/microsoft-edge/webview2/)
- [WPF Documentation](https://learn.microsoft.com/dotnet/desktop/wpf/)
- [Pointer Events API](https://developer.mozilla.org/docs/Web/API/Pointer_events)
- [postMessage API](https://developer.mozilla.org/docs/Web/API/Window/postMessage)
