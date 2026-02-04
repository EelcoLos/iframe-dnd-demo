# WebView2 Drag & Drop Demo Application

This is a native Windows WPF application that demonstrates all the drag-and-drop capabilities from the iframe-dnd-demo repository using Microsoft's WebView2 control.

> **🚀 New here?** Start with **[START-HERE.md](START-HERE.md)** for a guided tour!

## 📚 Documentation

- **[START-HERE.md](START-HERE.md)** - ⭐ Navigation guide for all documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 3 easy steps
- **[FEATURES.md](FEATURES.md)** - Complete feature overview and comparisons
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and implementation details
- **[SUMMARY.md](SUMMARY.md)** - Implementation overview and statistics
- **[README.md](README.md)** - This file - comprehensive guide

## ⚡ Quick Start

```bash
cd WebView2App
dotnet build
dotnet run
```

See [QUICKSTART.md](QUICKSTART.md) for detailed getting started instructions.

## Features

- **Native Windows Application**: Built with WPF and WebView2
- **Multiple Demo Modes**:
  - Basic Items: Simple drag-and-drop between panels
  - Table Rows: Drag table rows with calculations
  - HTML5 DnD: HTML5 Drag & Drop API implementation
- **Dynamic Layout**: Switch between horizontal and vertical layouts
- **WebView2 Controls**: Full browser capabilities including DevTools
- **All Repository Demos**: Hosts all HTML/JS demos from the public folder

## Prerequisites

- **Windows 10/11** (version 1803 or later)
- **.NET 10.0 SDK** or later
- **WebView2 Runtime** (usually pre-installed on Windows 10/11)
  - Download from: https://developer.microsoft.com/microsoft-edge/webview2/

## Building the Application

### Option 1: Using Visual Studio (Recommended)

1. Open `WebView2App.sln` (or the csproj file) in Visual Studio 2022
2. Restore NuGet packages (automatic on build)
3. Build the solution: `Build > Build Solution` (Ctrl+Shift+B)
4. Run: Press F5 or click the Start button

### Option 2: Using Command Line

```bash
# Navigate to the WebView2App directory
cd WebView2App

# Restore dependencies
dotnet restore

# Build the application
dotnet build

# Run the application
dotnet run
```

### Option 3: Building for Release

```bash
# Build for release
dotnet build --configuration Release

# Publish as a self-contained application
dotnet publish --configuration Release --self-contained --runtime win-x64 -p:PublishSingleFile=true

# The executable will be in: bin/Release/net10.0-windows/win-x64/publish/
```

## Running the Application

After building, run the executable:

```bash
# From the build output directory
.\bin\Debug\net10.0-windows\DragDropWebView2Demo.exe

# Or for release build
.\bin\Release\net10.0-windows\DragDropWebView2Demo.exe
```

## Using the Application

### Demo Modes

Click the mode buttons in the toolbar to switch between different demos:

- **Basic Items**: Drag colorful items from the left panel to drop zones on the right
- **Table Rows**: Drag table rows between construction calculation tables
- **HTML5 DnD**: Uses native HTML5 Drag & Drop API

### Layout Options

- **Horizontal**: WebView controls side-by-side (default)
- **Vertical**: WebView controls stacked vertically

### Navigation Controls

- **Back/Forward**: Navigate through browsing history in both WebViews
- **Refresh**: Reload both WebView controls
- **DevTools**: Open Edge DevTools for debugging the web content

### Individual WebView Controls

Each WebView has a header with:
- Status indicator (blue dot)
- Title showing current content
- Refresh button for that specific WebView

## How It Works

### WebView2 Architecture

The application hosts two WebView2 controls that load HTML/JS content from the `public` folder:

1. **Virtual Host Mapping**: The app uses `SetVirtualHostNameToFolderMapping` to serve local files via `https://app.local/` URL
2. **Independent WebViews**: Each WebView2 control is a separate embedded browser instance
3. **IFrame Communication**: The existing `iframe-communication.js` handles drag-and-drop coordination between the two WebViews

### File Structure

```
WebView2App/
├── WebView2App.csproj       # Project file with NuGet packages
├── App.xaml                 # Application entry point
├── App.xaml.cs              # Application code-behind
├── MainWindow.xaml          # Main window UI definition
├── MainWindow.xaml.cs       # Main window logic
└── README.md                # This file

The app automatically copies all files from ../public/ to the build output directory.
```

### Key Technologies

- **WPF (Windows Presentation Foundation)**: Modern Windows UI framework
- **WebView2**: Chromium-based web control for .NET
- **Microsoft.Web.WebView2 NuGet Package**: WebView2 SDK

## Troubleshooting

### "The system cannot find the path specified" (0x8C07CC03)

This error occurs when the `public` folder cannot be found. **Solution:**

1. **Build the project first** to copy the HTML/JS files:
   ```bash
   cd WebView2App
   dotnet build
   ```

2. **Verify the public folder exists**:
   - Check `bin/Debug/net10.0-windows/public/` contains HTML/JS files
   - Files should be copied automatically during build

3. **Run from the WebView2App directory**:
   ```bash
   cd WebView2App
   dotnet run
   ```

4. **If still failing**, do a clean rebuild:
   ```bash
   dotnet clean
   dotnet build
   dotnet run
   ```

The application searches for the `public` folder in:
- Build output: `{AppDirectory}/public/`
- Project structure: `../public/` (relative to WebView2App)
- Current directory: `{CurrentDirectory}/public/`

If none of these paths exist, you'll see a detailed error message with all paths searched.

### WebView2 Runtime Not Found

If you get an error about WebView2 runtime:

1. Download and install from: https://go.microsoft.com/fwlink/p/?LinkId=2124703
2. Or install via command line:
   ```bash
   winget install Microsoft.EdgeWebView2Runtime
   ```

### Files Not Loading

If the WebViews show blank or error pages:

1. Check that the `public` folder exists in the build output directory
2. Verify files are being copied by checking `bin/Debug/net10.0-windows/public/`
3. Open DevTools (🔧 button) to see console errors

### Build Errors

```bash
# Clean and rebuild
dotnet clean
dotnet build
```

### NuGet Package Issues

```bash
# Clear NuGet cache
dotnet nuget locals all --clear

# Restore packages
dotnet restore
```

## Development

### Adding New Demos

To add new demo content:

1. Add HTML/JS files to the `../public/` folder
2. Rebuild the application (files are auto-copied)
3. Update `LoadDemoMode()` in MainWindow.xaml.cs to include the new mode

### Debugging

- Use the **DevTools** button to inspect WebView content
- Set breakpoints in MainWindow.xaml.cs for C# code
- Check the status bar for messages

### Customization

The application can be customized by editing:

- **MainWindow.xaml**: UI layout and styling
- **MainWindow.xaml.cs**: Application logic and behavior
- **WebView2App.csproj**: Build settings and dependencies

## Differences from Browser-Based Demo

- **No Cross-Window Mode**: The two WebViews are in the same application window
- **Native Menus**: Windows-style title bar and menus
- **File System Access**: Direct access to local files via virtual hosting
- **DevTools Integration**: Built-in Edge DevTools support
- **Better Performance**: Native app performance vs. browser overhead

## License

Same as parent project (MIT)

## Links

- WebView2 Documentation: https://learn.microsoft.com/microsoft-edge/webview2/
- .NET Documentation: https://learn.microsoft.com/dotnet/
- Parent Repository: https://github.com/EelcoLos/iframe-dnd-demo
