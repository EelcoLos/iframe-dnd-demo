using System.Diagnostics;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using AvaloniaWebView;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Main application window. Hosts the embedded web view pointed at the local
/// static assets served by the built-in <see cref="LocalAssetServer"/>.
/// </summary>
public partial class MainWindow : Window
{
    private readonly LocalAssetServer _server;
    private WebView _mainWebView = null!;

    public MainWindow()
    {
        InitializeComponent();

        _mainWebView = this.FindControl<WebView>("MainWebView")!;

        _server = new LocalAssetServer();
        _server.Start();

        _mainWebView.Url = new Uri(_server.BaseUrl + "/parent.html");

        Closing += (_, _) => _server.Stop();
    }

    private void OnOpenHybridCoordinator(object? sender, RoutedEventArgs e)
    {
        var coordinator = new HybridCoordinatorWindow(_server.BaseUrl);
        coordinator.Show();
    }

    private void OnOpenInBrowser(object? sender, RoutedEventArgs e)
    {
        var url = _server.BaseUrl + "/parent.html";
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] Failed to open browser: {ex.Message}");
        }
    }
}
