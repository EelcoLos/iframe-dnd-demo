using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Text.Json;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Threading;
using AvaloniaWebView;
using WebViewCore.Events;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Hybrid coordinator window: source is the web-based Available Items table,
/// target is a native Avalonia DataGrid.
/// On WSL a native browser-link panel replaces the embedded WebView.
/// </summary>
public partial class HybridCoordinatorWindow : Window
{
    private readonly string _baseUrl;
    private readonly ObservableCollection<RowItem> _rows = [];
    private RowItem? _pendingDragRow;

    // Only set when running with an embedded WebView (non-WSL)
    private WebView? _sourceWebView;

    private ContentControl _sourceContent = null!;
    private DataGrid _targetGrid = null!;
    private TextBlock _statusLabel = null!;
    private TextBlock _totalLabel = null!;

    public HybridCoordinatorWindow(string baseUrl, LocalAssetServer? server = null)
    {
        _baseUrl = baseUrl;
        InitializeComponent();

        _sourceContent = this.FindControl<ContentControl>("SourceContent")!;
        _targetGrid    = this.FindControl<DataGrid>("TargetGrid")!;
        _statusLabel   = this.FindControl<TextBlock>("StatusLabel")!;
        _totalLabel    = this.FindControl<TextBlock>("TotalLabel")!;

        _targetGrid.ItemsSource = _rows;

        if (PlatformHelper.IsWsl)
        {
            // In WSL the web page runs in a Windows browser; bridge messages
            // arrive via POST /bridge handled by the LocalAssetServer.
            if (server != null)
                server.BridgeMessage += json => ProcessBridgeMessage(json);

            _sourceContent.Content = BuildWslFallbackPanel();
            _statusLabel.Text = "Open the source page in your browser, then drag or Ctrl+C rows — they'll appear here.";
        }
        else
        {
            InitWebView();
        }
    }

    // ── WebView (non-WSL) ────────────────────────────────────────────────────

    private void InitWebView()
    {
        var webView = new WebView();
        _sourceWebView = webView;
        webView.WebMessageReceived += OnWebMessageReceived;
        webView.NavigationCompleted += OnNavigationCompleted;
        _sourceContent.Content = webView;

        // Navigate after the window is shown so the WebView is fully attached.
        Opened += (_, _) => webView.Url = new Uri(_baseUrl + "/webcomponent-table-source-html5.html");
    }

    private void OnNavigationCompleted(object? sender, WebViewUrlLoadedEventArg e)
    {
        if (!e.IsSuccess)
            Console.Error.WriteLine("[HybridCoordinator] Navigation failed.");
    }

    private void OnWebMessageReceived(object? sender, WebViewMessageReceivedEventArgs e)
    {
        var json = e.Message ?? e.MessageAsJson;
        if (!string.IsNullOrWhiteSpace(json))
            ProcessBridgeMessage(json);
    }

    // ── WSL fallback panel ───────────────────────────────────────────────────

    private Panel BuildWslFallbackPanel()
    {
        var sourceUrl = _baseUrl + "/webcomponent-table-source-html5.html";

        var panel = new StackPanel
        {
            Spacing = 10,
            Margin = new Avalonia.Thickness(16),
            VerticalAlignment = VerticalAlignment.Center
        };

        panel.Children.Add(new TextBlock
        {
            Text = "WSL detected — WebView embedding is not supported under WSL.",
            FontWeight = FontWeight.SemiBold,
            TextWrapping = TextWrapping.Wrap
        });

        panel.Children.Add(new TextBlock
        {
            Text = "Open the web source in your Windows browser to use the copy bridge:",
            TextWrapping = TextWrapping.Wrap
        });

        panel.Children.Add(new SelectableTextBlock
        {
            Text = sourceUrl,
            FontFamily = new FontFamily("Courier New,Consolas,monospace"),
            Foreground = new SolidColorBrush(Color.Parse("#3730a3")),
            TextWrapping = TextWrapping.Wrap
        });

        var btn = new Button { Content = "🌐  Open Source Page in Windows Browser", HorizontalAlignment = HorizontalAlignment.Left };
        btn.Click += (_, _) => PlatformHelper.OpenInBrowser(sourceUrl);
        panel.Children.Add(btn);

        panel.Children.Add(new TextBlock
        {
            Text = "In the browser, press Ctrl+C on a row — it will appear in the DataGrid below via the clipboard bridge.",
            TextWrapping = TextWrapping.Wrap,
            Foreground = new SolidColorBrush(Color.Parse("#64748b")),
            FontStyle = Avalonia.Media.FontStyle.Italic
        });

        return panel;
    }

    /// <summary>
    /// Dispatches an incoming bridge JSON message to the appropriate handler.
    /// </summary>
    private void ProcessBridgeMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("action", out var actionProp))
                return;

            switch (actionProp.GetString())
            {
                case "dragstart":
                    _pendingDragRow = ParseRowFromJson(root);
                    break;

                case "dragend":
                    _pendingDragRow = null;
                    break;

                case "drop":
                    var dropRow = ParseRowFromJson(root);
                    if (dropRow is not null)
                        Dispatcher.UIThread.Post(() => InsertRow(dropRow));
                    break;

                case "copy":
                    var copyRow = ParseRowFromJson(root);
                    if (copyRow is not null)
                        Dispatcher.UIThread.Post(() => InsertRow(copyRow));
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[HybridCoordinator] Bridge message error: {ex.Message}");
        }
    }

    private void InsertRow(RowItem row)
    {
        _rows.Add(row);
        RecalculateTotal();
        _statusLabel.Text = $"Added: {row.Description}";
    }

    private void RecalculateTotal()
    {
        var total = _rows.Sum(r => r.Amount);
        _totalLabel.Text = $"TOTAL: €{total:N2}";
    }

    /// <summary>
    /// Parses description / quantity / unitPrice from a bridge JSON element.
    /// Both Number and String ValueKinds are accepted per the contract spec.
    /// </summary>
    private static RowItem? ParseRowFromJson(JsonElement root)
    {
        var description = root.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";

        int quantity = 0;
        if (root.TryGetProperty("quantity", out var q))
            quantity = q.ValueKind == JsonValueKind.Number
                ? q.GetInt32()
                : int.TryParse(q.GetString(), out var qi) ? qi : 0;

        decimal unitPrice = 0m;
        if (root.TryGetProperty("unitPrice", out var u))
            unitPrice = u.ValueKind == JsonValueKind.Number
                ? u.GetDecimal()
                : decimal.TryParse(u.GetString(), System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var ud) ? ud : 0m;

        if (string.IsNullOrWhiteSpace(description))
            return null;

        return new RowItem(description, quantity, unitPrice);
    }
}

/// <summary>Represents a single row in the native target grid.</summary>
public record RowItem(string Description, int Quantity, decimal UnitPrice)
{
    public decimal Amount => Quantity * UnitPrice;
}
