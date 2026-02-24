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
        var coordinator = new HybridCoordinatorWindow(_server.BaseUrl, _server);
        coordinator.Show();
    }

    private void OnOpenInBrowser(object? sender, RoutedEventArgs e) =>
        PlatformHelper.OpenInBrowser(_server.BaseUrl + "/parent.html");
}
