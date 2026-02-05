# WebView2 Native Application

.NET 10 WPF application demonstrating iframe drag-and-drop in WebView2 controls with multi-window support and WinForms hybrid mode.

## Quick Start

```bash
cd WebView2App
dotnet build
dotnet run
```

**Requirements:** Windows 10 v1803+, .NET 10.0 SDK, WebView2 Runtime (pre-installed on modern Windows)

## Features

### Demo Modes

1. **Basic Items** - Simple drag & drop between dual WebView2 panels
2. **Table Rows** - Table with calculations in dual WebView2 panels
3. **HTML5 DnD** - Standard HTML5 drag-and-drop demo
4. **Multi-Window** - Separate WPF windows with Web Components tables
5. **Hybrid Mode** - WebView2 (Web Components) → WinForms DataGridView
6. **Hybrid Multi-Window** - WebView2 source window + WinForms target window

### Cross-Window Drag & Drop

- Cursor-based positioning using `e.clientY + getBoundingClientRect()`
- Cross-window messaging via postMessage + BroadcastChannel
- Hover preview shows future total: `$6,250 → $11,650`
- Green flash animation on total update
- Keyboard shortcuts (Ctrl+C/V) work across windows

### WinForms Integration

Hybrid modes embed native `DataGridView` via `WindowsFormsHost`:
- Auto-calculated row and grand totals
- Currency formatting
- Double-click in WebView2 to add to DataGridView
- Delete key to remove rows
- Clear button to reset

## Technical Details

**WebView2 Integration:**
- Virtual host mapping: `https://app.local/` → `public/`
- Path detection across 4 locations with detailed error messages
- Async initialization staying on WPF UI thread

**Security:**
- XSS protection: separates DOM structure (`innerHTML`) from content (`textContent`)
- Fully qualified type names to avoid WPF/WinForms namespace conflicts

**Data Transfer:**
- WebView → C#: `window.chrome.webview.postMessage({action, data})`
- C#: `CoreWebView2.WebMessageReceived` event handler
- Cross-window: HybridCommunicationManager broadcasts via postMessage

## Architecture

```
┌─────────────────────────────────┐
│   MainWindow (WPF)              │
├─────────────────────────────────┤
│  Dual WebView2 Controls         │
│  ┌───────────┐  ┌────────────┐  │
│  │ WebView1  │  │ WebView2   │  │
│  │ (Source)  │──▶│ (Target)   │  │
│  └───────────┘  └────────────┘  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   HybridModeWindow (WPF)        │
├─────────────────┬───────────────┤
│  WebView2       │  WindowsForms │
│  (Web Comps)    │  Host         │
│  ┌───────────┐  │ ┌───────────┐ │
│  │ HTML5     │  │ │ DataGrid  │ │
│  │ Table     │──┼─▶│ View      │ │
│  │           │  │ │ (Native)  │ │
│  └───────────┘  │ └───────────┘ │
└─────────────────┴───────────────┘
```

## Files

**Application:** `MainWindow.*`, `MultiWindowCoordinator.*`, `HybridModeWindow.*`, `HybridMultiWindowCoordinator.*`, `App.*`, `WebView2App.csproj`

**Web Components:** `public/webcomponent-table-*-html5.html`, `public/hybrid-communication.js`

## Build & Distribution

- **Framework-dependent:** `dotnet build && dotnet run`
- **Self-contained:** `dotnet publish -c Release --self-contained --runtime win-x64 -p:PublishSingleFile=true`

See inline code comments for implementation details.
