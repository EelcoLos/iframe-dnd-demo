# WebView2 App Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Prerequisites Check

Before you begin, ensure you have:

- **Windows 10** (version 1803+) or **Windows 11**
- **.NET 8.0 SDK** - [Download here](https://dotnet.microsoft.com/download/dotnet/8.0)
- **WebView2 Runtime** - Usually pre-installed on Windows 10/11
  - If needed: [Download here](https://go.microsoft.com/fwlink/p/?LinkId=2124703)

### 2. Build the App

Open a terminal (PowerShell or Command Prompt) and run:

```bash
# Navigate to the WebView2App directory
cd WebView2App

# Build the application
dotnet build
```

### 3. Run the App

```bash
dotnet run
```

That's it! The application window will open with two WebView2 controls showing the drag-and-drop demo.

## 🎮 Using the App

### Demo Modes

Try each demo mode by clicking the toolbar buttons:

1. **Basic Items** (default)
   - Drag colorful items from left to right
   - Drop into To Do, In Progress, or Done zones

2. **Table Rows**
   - Drag entire table rows
   - See automatic calculations update
   - Try keyboard copy/paste (Ctrl+C, Ctrl+V)

3. **HTML5 DnD**
   - Uses native HTML5 Drag & Drop API
   - Same functionality, different implementation

### Layout Options

- **Horizontal**: WebView controls side-by-side (default)
- **Vertical**: WebView controls stacked

### Developer Tools

Click the **🔧 DevTools** button to open Edge DevTools and inspect the web content, just like in a browser.

## 🐛 Troubleshooting

### "The system cannot find the path specified" or DirectoryNotFoundException

This error means the `public` folder with HTML/JS files wasn't found. Fix it by:

1. **Build the project first** (this copies the files):
   ```bash
   dotnet build
   ```

2. **Verify the public folder exists**:
   - Check `bin/Debug/net8.0-windows/public/` has HTML/JS files
   - Or check that `../public/` exists relative to the WebView2App directory

3. **Run from the correct directory**:
   ```bash
   cd WebView2App
   dotnet run
   ```

4. **If still failing**, try a clean rebuild:
   ```bash
   dotnet clean
   dotnet build
   dotnet run
   ```

The app will search for the `public` folder in these locations:
- `{AppBaseDirectory}/public/` (build output)
- `../public/` (project structure)
- `{CurrentDirectory}/public/`

### "WebView2 Runtime not found"

Install the WebView2 Runtime:
```bash
winget install Microsoft.EdgeWebView2Runtime
```

### "dotnet: command not found"

Install .NET 8.0 SDK from https://dotnet.microsoft.com/download

### Blank/white screens in WebViews

1. Check that `public` folder exists in the build output:
   - Look in `bin/Debug/net8.0-windows/public/`
2. Open DevTools to see console errors
3. Try rebuilding: `dotnet clean && dotnet build`

## 📦 Building for Distribution

Create a standalone executable:

```bash
dotnet publish -c Release --self-contained --runtime win-x64 -p:PublishSingleFile=true
```

The executable will be in: `bin/Release/net8.0-windows/win-x64/publish/DragDropWebView2Demo.exe`

## 💡 Next Steps

- Read the full [README.md](README.md) for detailed information
- Explore the source code in `MainWindow.xaml.cs`
- Try modifying the UI in `MainWindow.xaml`
- Add your own demos by creating HTML files in the `../public/` folder

## 🆘 Need Help?

- WebView2 Docs: https://learn.microsoft.com/microsoft-edge/webview2/
- .NET Docs: https://learn.microsoft.com/dotnet/
- Project Issues: https://github.com/EelcoLos/iframe-dnd-demo/issues

Happy coding! 🎯
