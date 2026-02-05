# WebView2 Native Application

## Overview

This repository now includes a complete **native Windows WPF application** that demonstrates all the drag-and-drop capabilities using Microsoft's WebView2 control.

## What is WebView2?

WebView2 is Microsoft's embedded browser control based on Chromium (Microsoft Edge). It allows you to host web content in native Windows applications with full browser capabilities.

## What's Included

A fully functional Windows desktop application in the `WebView2App/` directory that includes:

- **WPF Application**: Modern Windows UI built with XAML
- **Dual WebView2 Controls**: Two embedded browsers working together
- **All Demo Modes**: Basic Items, Table Rows, and HTML5 Drag & Drop
- **Full Documentation**: Quick start, features, and architecture guides

## Quick Start

### Prerequisites

- Windows 10/11
- .NET 10.0 SDK
- WebView2 Runtime (usually pre-installed)

### Run the App

```bash
cd WebView2App
dotnet build
dotnet run
```

The application window will open with two WebView2 controls showing the drag-and-drop demo.

## Why WebView2?

### Advantages

✅ **Native Performance**: Better than browser-hosted versions
✅ **Offline Capable**: No web server required
✅ **Windows Integration**: Full access to Windows APIs
✅ **DevTools Built-in**: Chrome DevTools for debugging
✅ **Easy Distribution**: Single executable deployment
✅ **Auto-Updates**: WebView2 runtime updates automatically

### Use Cases

Perfect for:
- Desktop applications with web UI
- Embedding web dashboards in native apps
- Migrating web apps to desktop
- Hybrid web/native applications
- Enterprise internal tools

## Features

### Demo Modes

1. **Basic Items Demo**
   - Drag colorful items between panels
   - Visual hover feedback
   - Success animations

2. **Table Rows Demo**
   - Drag entire table rows
   - Automatic calculations
   - Keyboard copy/paste support

3. **HTML5 DnD Demo**
   - Native HTML5 Drag & Drop API
   - Standard browser behavior

### Application Features

- **Layout Options**: Horizontal or vertical WebView arrangement
- **Navigation**: Back, forward, refresh controls
- **DevTools**: Built-in Edge DevTools for each WebView
- **Status Bar**: Runtime info and status messages
- **Modern UI**: Windows 11-style interface

## Documentation

Comprehensive documentation is available in the `WebView2App/` directory:

- **[CONSOLIDATED-README.md](WebView2App/CONSOLIDATED-README.md)** - Complete guide with quick start, features, and technical details

## How It Works

```
┌─────────────────────────────────────────┐
│         WPF Application Window          │
│  ┌─────────────┐    ┌─────────────┐    │
│  │  WebView2   │    │  WebView2   │    │
│  │     #1      │    │     #2      │    │
│  │             │    │             │    │
│  │ frame-a.html│    │frame-b.html │    │
│  │             │    │             │    │
│  └─────────────┘    └─────────────┘    │
│                                         │
│  Virtual Host: https://app.local/       │
│  Maps to: {AppDir}/public/              │
└─────────────────────────────────────────┘
```

### Key Technologies

- **WPF (Windows Presentation Foundation)**: UI framework
- **WebView2**: Chromium-based browser control  
- **Virtual Host Mapping**: Serves local files securely
- **postMessage**: Communication between WebViews
- **iframe-communication.js**: Coordinates drag-and-drop

## Building

### Using Visual Studio

1. Open `WebView2App/WebView2App.sln`
2. Press F5 to build and run

### Using Command Line

```bash
cd WebView2App

# Debug build
dotnet build

# Release build
dotnet build -c Release

# Self-contained deployment
dotnet publish -c Release --self-contained --runtime win-x64
```

## Distribution

### Framework-Dependent (Smaller)

Requires .NET 10.0 installed on target machine:

```bash
dotnet publish -c Release
```

Size: ~10-20 MB

### Self-Contained (Standalone)

Includes .NET runtime, no installation needed:

```bash
dotnet publish -c Release --self-contained --runtime win-x64 -p:PublishSingleFile=true
```

Size: ~80-100 MB (single .exe file)

## System Requirements

### Minimum

- Windows 10 version 1803 or later
- 4 GB RAM
- 200 MB disk space

### Recommended

- Windows 11
- 8 GB RAM or more
- SSD for better performance

## Troubleshooting

### WebView2 Runtime Not Found

Install the runtime:

```bash
winget install Microsoft.EdgeWebView2Runtime
```

Or download from: https://go.microsoft.com/fwlink/p/?LinkId=2124703

### Blank WebView Windows

1. Check that `public/` folder exists in build output
2. Open DevTools (🔧 button) to see errors
3. Rebuild: `dotnet clean && dotnet build`

## Comparison with Web Version

| Aspect | Web (Browser) | WebView2 App |
|--------|---------------|--------------|
| Installation | None needed | One-time install |
| Offline Use | Requires server | ✅ Fully offline |
| Performance | Browser overhead | ✅ Native speed |
| Updates | Automatic | Manual/Auto-update |
| Distribution | URL | Executable file |
| DevTools | Browser DevTools | ✅ Embedded DevTools |

## Learn More

- **WebView2 Documentation**: https://learn.microsoft.com/microsoft-edge/webview2/
- **WPF Guide**: https://learn.microsoft.com/dotnet/desktop/wpf/
- **.NET 10 Documentation**: https://learn.microsoft.com/dotnet/

## Example Use Cases

This WebView2 pattern is perfect for:

1. **Internal Enterprise Tools**
   - Dashboard applications
   - Data visualization tools
   - Admin panels

2. **Desktop Versions of Web Apps**
   - Offline-first apps
   - Better OS integration
   - Native file access

3. **Hybrid Applications**
   - Web UI with native backend
   - COM object integration
   - Windows API access

4. **Embedded Web Content**
   - Help documentation
   - Rich text editors
   - Report viewers

## Contributing

To add new demos to the WebView2 app:

1. Add HTML/JS files to `public/` directory
2. Update `LoadDemoMode()` in `MainWindow.xaml.cs`
3. Add button in `MainWindow.xaml`
4. Rebuild and test

## License

Same as parent project (MIT)

---

**Ready to explore drag-and-drop in a native Windows application?**

Start here: [WebView2App/CONSOLIDATED-README.md](WebView2App/CONSOLIDATED-README.md)
