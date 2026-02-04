using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace WebView2App;

/// <summary>
/// Multi-Window Coordinator Window
/// Opens separate WebView2 windows for drag and drop between windows
/// </summary>
public partial class MultiWindowCoordinator : Window
{
    private string _publicFolderPath = string.Empty;

    public MultiWindowCoordinator(string publicFolderPath)
    {
        InitializeComponent();
        _publicFolderPath = publicFolderPath;
        InitializeAsync();
    }

    private async void InitializeAsync()
    {
        try
        {
            // Ensure WebView2 runtime is available
            await CoordinatorWebView.EnsureCoreWebView2Async(null);

            // Set up virtual host mapping
            CoordinatorWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local", _publicFolderPath,
                CoreWebView2HostResourceAccessKind.Allow);

            // Allow opening new windows
            CoordinatorWebView.CoreWebView2.NewWindowRequested += CoreWebView2_NewWindowRequested;

            // Load the coordinator page
            CoordinatorWebView.CoreWebView2.Navigate("https://app.local/webview2-multiwindow-coordinator.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error initializing Multi-Window Coordinator: {ex.Message}",
                "Initialization Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void CoreWebView2_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        // Create a new window for the popup
        var deferral = e.GetDeferral();

        try
        {
            // Create new window
            var newWindow = new Window
            {
                Width = 900,
                Height = 700,
                WindowStartupLocation = WindowStartupLocation.Manual
            };

            // Determine position based on which window is being opened
            if (e.Uri.Contains("source"))
            {
                newWindow.Left = 100;
                newWindow.Top = 100;
                newWindow.Title = "Available Items Table";
            }
            else if (e.Uri.Contains("target"))
            {
                newWindow.Left = 1020;
                newWindow.Top = 100;
                newWindow.Title = "Construction Calculation Table";
            }
            else
            {
                newWindow.Left = Left + 50;
                newWindow.Top = Top + 50;
                newWindow.Title = "Web Component Table";
            }

            // Create WebView2 control
            var webView = new Microsoft.Web.WebView2.Wpf.WebView2();
            newWindow.Content = webView;

            // Initialize the WebView2
            await webView.EnsureCoreWebView2Async(null);

            // Set up virtual host mapping
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local", _publicFolderPath,
                CoreWebView2HostResourceAccessKind.Allow);

            // Use the requested WebView2 for the new window
            e.NewWindow = webView.CoreWebView2;

            // Show the window
            newWindow.Show();

            // Handle window closing
            newWindow.Closed += (s, args) =>
            {
                webView.Dispose();
            };
        }
        finally
        {
            deferral.Complete();
        }
    }
}
