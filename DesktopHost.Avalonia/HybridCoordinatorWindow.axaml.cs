using System.Collections.ObjectModel;
using System.Text.Json;
using Avalonia.Controls;
using Avalonia.Threading;
using AvaloniaWebView;
using WebViewCore.Events;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Hybrid coordinator window: source is the web-based Available Items table
/// (HTML/JS inside an embedded WebView), target is a native Avalonia DataGrid.
/// Implements the Desktop Bridge Contract between the web source and native target.
/// </summary>
public partial class HybridCoordinatorWindow : Window
{
    private readonly string _baseUrl;
    private readonly ObservableCollection<RowItem> _rows = [];
    private RowItem? _pendingDragRow;

    private WebView _sourceWebView = null!;
    private DataGrid _targetGrid = null!;
    private TextBlock _statusLabel = null!;
    private TextBlock _totalLabel = null!;

    public HybridCoordinatorWindow(string baseUrl)
    {
        _baseUrl = baseUrl;
        InitializeComponent();

        _sourceWebView = this.FindControl<WebView>("SourceWebView")!;
        _targetGrid    = this.FindControl<DataGrid>("TargetGrid")!;
        _statusLabel   = this.FindControl<TextBlock>("StatusLabel")!;
        _totalLabel    = this.FindControl<TextBlock>("TotalLabel")!;

        _targetGrid.ItemsSource = _rows;

        // WebView.Avalonia surfaces window.chrome.webview.postMessage calls from the
        // web page directly as WebMessageReceived events — no shim injection needed.
        _sourceWebView.WebMessageReceived += OnWebMessageReceived;
        _sourceWebView.NavigationCompleted += OnNavigationCompleted;

        // Set URL after window is shown so the WebView is fully attached to the visual tree.
        Opened += (_, _) => _sourceWebView.Url = new Uri(_baseUrl + "/webcomponent-table-source-html5.html");
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
