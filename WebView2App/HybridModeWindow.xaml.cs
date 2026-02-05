using System;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace WebView2App
{
    public partial class HybridModeWindow : Window
    {
        private string? _publicFolderPath;

        public HybridModeWindow()
        {
            InitializeComponent();
            Loaded += HybridModeWindow_Loaded;
        }

        private async void HybridModeWindow_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Find the public folder
                _publicFolderPath = FindPublicFolder();
                
                if (_publicFolderPath == null)
                {
                    MessageBox.Show(
                        "Public folder not found. Please ensure the project is built correctly.",
                        "Initialization Error",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                    Close();
                    return;
                }

                StatusText.Text = $"Loading hybrid mode from: {_publicFolderPath}";

                // Initialize both WebView2 controls
                await WebViewSource.EnsureCoreWebView2Async(null);
                await WebViewTarget.EnsureCoreWebView2Async(null);

                // Set up virtual host mapping for both
                WebViewSource.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "app.local",
                    _publicFolderPath,
                    CoreWebView2HostResourceAccessKind.Allow);

                WebViewTarget.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "app.local",
                    _publicFolderPath,
                    CoreWebView2HostResourceAccessKind.Allow);

                // Navigate to hybrid pages
                // Left: WebView source (Web Components)
                WebViewSource.CoreWebView2.Navigate("https://app.local/webcomponent-table-source-html5.html");
                
                // Right: Desktop target (standard HTML5 table)
                WebViewTarget.CoreWebView2.Navigate("https://app.local/window-frame-b-table-html5.html");

                StatusText.Text = "Hybrid mode loaded - Drag from WebView source to Desktop target";
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Error initializing Hybrid Mode: {ex.Message}",
                    "Initialization Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                Close();
            }
        }

        private string? FindPublicFolder()
        {
            var appDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Try multiple locations
            var searchPaths = new[]
            {
                Path.Combine(appDir, "public"),
                Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(Path.GetDirectoryName(appDir))) ?? "", "public"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "public"),
                Path.Combine(Directory.GetCurrentDirectory(), "public")
            };

            foreach (var path in searchPaths)
            {
                var fullPath = Path.GetFullPath(path);
                if (Directory.Exists(fullPath))
                {
                    return fullPath;
                }
            }

            return null;
        }

        private void BackButton_Click(object sender, RoutedEventArgs e)
        {
            if (WebViewSource.CoreWebView2?.CanGoBack == true)
                WebViewSource.CoreWebView2.GoBack();
            if (WebViewTarget.CoreWebView2?.CanGoBack == true)
                WebViewTarget.CoreWebView2.GoBack();
        }

        private void ForwardButton_Click(object sender, RoutedEventArgs e)
        {
            if (WebViewSource.CoreWebView2?.CanGoForward == true)
                WebViewSource.CoreWebView2.GoForward();
            if (WebViewTarget.CoreWebView2?.CanGoForward == true)
                WebViewTarget.CoreWebView2.GoForward();
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            WebViewSource.CoreWebView2?.Reload();
            WebViewTarget.CoreWebView2?.Reload();
        }

        private void DevToolsLeftButton_Click(object sender, RoutedEventArgs e)
        {
            WebViewSource.CoreWebView2?.OpenDevToolsWindow();
        }

        private void DevToolsRightButton_Click(object sender, RoutedEventArgs e)
        {
            WebViewTarget.CoreWebView2?.OpenDevToolsWindow();
        }
    }
}
