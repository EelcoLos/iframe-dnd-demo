using System.IO;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Core;

namespace WebView2App;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private string _publicFolderPath = string.Empty;
    private string _currentMode = "basic";
    private bool _isInitialized = false;

    public MainWindow()
    {
        InitializeComponent();
        InitializeAsync();
    }

    private async void InitializeAsync()
    {
        try
        {
            // Get the path to the public folder
            var appPath = AppDomain.CurrentDomain.BaseDirectory;
            _publicFolderPath = Path.Combine(appPath, "public");

            // Ensure WebView2 runtime is available
            await WebView1.EnsureCoreWebView2Async(null);
            await WebView2.EnsureCoreWebView2Async(null);

            // Set up virtual host mapping to serve local files
            WebView1.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local", _publicFolderPath, 
                CoreWebView2HostResourceAccessKind.Allow);
            
            WebView2.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local", _publicFolderPath, 
                CoreWebView2HostResourceAccessKind.Allow);

            // Enable communication between WebViews (inject script for iframe communication)
            await InjectCommunicationScript();

            // Load initial pages
            LoadDemoMode("basic");

            _isInitialized = true;
            UpdateStatus("WebView2 application ready");
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error initializing WebView2: {ex.Message}", "Initialization Error", 
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async Task InjectCommunicationScript()
    {
        // This script will be injected to facilitate communication between the two WebViews
        // In a real scenario, the iframe-communication.js handles this, but we need to adapt it
        var script = @"
            window.addEventListener('DOMContentLoaded', function() {
                console.log('WebView2 page loaded');
            });
        ";

        await WebView1.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
        await WebView2.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
    }

    private void LoadDemoMode(string mode)
    {
        _currentMode = mode;

        string page1, page2, title1, title2;

        switch (mode)
        {
            case "table":
                page1 = "frame-a-table.html";
                page2 = "frame-b-table.html";
                title1 = "WebView2 #1 - Construction Calculation";
                title2 = "WebView2 #2 - Candidate Rows";
                break;
            case "html5":
                page1 = "window-frame-a-html5.html";
                page2 = "window-frame-b-html5.html";
                title1 = "WebView2 #1 - HTML5 Draggable";
                title2 = "WebView2 #2 - HTML5 Drop Zones";
                break;
            default: // basic
                page1 = "frame-a.html";
                page2 = "frame-b.html";
                title1 = "WebView2 #1 - Draggable Items";
                title2 = "WebView2 #2 - Drop Zones";
                break;
        }

        WebView1.CoreWebView2.Navigate($"https://app.local/{page1}");
        WebView2.CoreWebView2.Navigate($"https://app.local/{page2}");

        WebView1Title.Text = title1;
        WebView2Title.Text = title2;

        UpdateStatus($"Loaded {mode} demo mode");
    }

    private void UpdateStatus(string message)
    {
        StatusText.Text = message;
    }

    private void ModeButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_isInitialized) return;

        var button = sender as Button;
        if (button == null) return;

        var mode = button.Tag as string;
        if (mode == null) return;

        // Update button styles
        BasicModeButton.Style = (Style)FindResource("ModernButton");
        TableModeButton.Style = (Style)FindResource("ModernButton");
        Html5ModeButton.Style = (Style)FindResource("ModernButton");
        button.Style = (Style)FindResource("ActiveButton");

        // Load the new mode
        LoadDemoMode(mode);
    }

    private void LayoutButton_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as Button;
        if (button == null) return;

        var layout = button.Tag as string;

        // Update button styles
        HorizontalLayoutButton.Style = (Style)FindResource("ModernButton");
        VerticalLayoutButton.Style = (Style)FindResource("ModernButton");
        button.Style = (Style)FindResource("ActiveButton");

        if (layout == "vertical")
        {
            // Change to vertical layout
            MainGrid.ColumnDefinitions.Clear();
            MainGrid.RowDefinitions.Clear();

            MainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            MainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(5) });
            MainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            Grid.SetColumn(WebView1.Parent as UIElement, 0);
            Grid.SetRow(WebView1.Parent as UIElement, 0);
            
            Grid.SetColumn(WebView2.Parent as UIElement, 0);
            Grid.SetRow(WebView2.Parent as UIElement, 2);

            UpdateStatus("Switched to vertical layout");
        }
        else
        {
            // Change to horizontal layout
            MainGrid.RowDefinitions.Clear();
            MainGrid.ColumnDefinitions.Clear();

            MainGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            MainGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(5) });
            MainGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Grid.SetRow(WebView1.Parent as UIElement, 0);
            Grid.SetColumn(WebView1.Parent as UIElement, 0);
            
            Grid.SetRow(WebView2.Parent as UIElement, 0);
            Grid.SetColumn(WebView2.Parent as UIElement, 2);

            UpdateStatus("Switched to horizontal layout");
        }
    }

    private void BackButton_Click(object sender, RoutedEventArgs e)
    {
        if (WebView1.CoreWebView2.CanGoBack)
            WebView1.CoreWebView2.GoBack();
        if (WebView2.CoreWebView2.CanGoBack)
            WebView2.CoreWebView2.GoBack();
        
        UpdateStatus("Navigated back");
    }

    private void ForwardButton_Click(object sender, RoutedEventArgs e)
    {
        if (WebView1.CoreWebView2.CanGoForward)
            WebView1.CoreWebView2.GoForward();
        if (WebView2.CoreWebView2.CanGoForward)
            WebView2.CoreWebView2.GoForward();
        
        UpdateStatus("Navigated forward");
    }

    private void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        WebView1.CoreWebView2.Reload();
        WebView2.CoreWebView2.Reload();
        UpdateStatus("Refreshed all WebView2 controls");
    }

    private void RefreshWebView1_Click(object sender, RoutedEventArgs e)
    {
        WebView1.CoreWebView2.Reload();
        UpdateStatus("Refreshed WebView #1");
    }

    private void RefreshWebView2_Click(object sender, RoutedEventArgs e)
    {
        WebView2.CoreWebView2.Reload();
        UpdateStatus("Refreshed WebView #2");
    }

    private void DevToolsButton_Click(object sender, RoutedEventArgs e)
    {
        // Open DevTools for WebView1
        WebView1.CoreWebView2.OpenDevToolsWindow();
        UpdateStatus("Opened DevTools for WebView #1");
    }

    private void MultiWindowButton_Click(object sender, RoutedEventArgs e)
    {
        // Open the multi-window coordinator in a new window
        var multiWindowCoordinator = new MultiWindowCoordinator(_publicFolderPath);
        multiWindowCoordinator.Show();
        UpdateStatus("Opened Multi-Window Table Demo (Web Components)");
    }
}
