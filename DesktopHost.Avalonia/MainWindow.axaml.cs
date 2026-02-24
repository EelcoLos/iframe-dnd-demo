using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Interactivity;

namespace DragDropAvaloniaDemo;

public partial class MainWindow : Window
{
    private readonly LocalAssetServer _server;
    private TextBlock _serverUrlLabel = null!;

    public MainWindow()
    {
        InitializeComponent();

        _serverUrlLabel = this.FindControl<TextBlock>("ServerUrlLabel")!;

        _server = new LocalAssetServer();
        _server.Start();

        _serverUrlLabel.Text = $"Local server: {_server.BaseUrl}";

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
            // In WSL, use wslview or cmd.exe to open the Windows browser
            if (IsWsl())
            {
                var wslview = Process.Start(new ProcessStartInfo("wslview", url) { UseShellExecute = false });
                if (wslview == null)
                    Process.Start(new ProcessStartInfo("cmd.exe", $"/c start {url}") { UseShellExecute = false });
            }
            else
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] Failed to open browser: {ex.Message}");
        }
    }

    private static bool IsWsl() =>
        File.Exists("/proc/version") &&
        File.ReadAllText("/proc/version").Contains("microsoft", StringComparison.OrdinalIgnoreCase);
}
