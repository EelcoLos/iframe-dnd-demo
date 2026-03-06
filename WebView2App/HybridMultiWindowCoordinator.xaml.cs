using System;
using System.Drawing;
using System.IO;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace WebView2App
{
    /// <summary>
    /// Represents parsed row data from JSON
    /// </summary>
    public readonly struct RowData
    {
        public string Description { get; init; }
        public int Quantity { get; init; }
        public decimal UnitPrice { get; init; }
    }

    /// <summary>
    /// Hybrid Multi-Window Coordinator
    /// Opens separate WebView2 (source) and WinForms (target) windows for drag-and-drop
    /// </summary>
    public partial class HybridMultiWindowCoordinator : Window
    {
        private string? _publicFolderPath;
        private Window? _sourceWindow;
        private Window? _targetWindow;
        private string? _copiedRowDataJson; // Stores JSON string of copied row data for paste
        private string? _currentDragDataJson; // Stores JSON string of currently dragging row for hover preview
        private bool _isDragging = false; // Tracks if a drag operation is active
        private DispatcherTimer? _dragHoverTimer; // Timer to poll mouse position during drag
        private DataGridView? _targetDataGridView; // Store reference to DataGridView
        private System.Windows.Controls.TextBlock? _targetStatusText; // Status bar in target window
        private int _dragHoverRowIndex = -1; // Track which row is being hovered during drag
        private decimal _originalGrandTotal = 0; // Stores original grand total before drag preview
        private bool _isShowingHoverPreview = false; // Tracks if we're showing hover preview in TOTAL row

        public HybridMultiWindowCoordinator()
        {
            InitializeComponent();
            Loaded += HybridMultiWindowCoordinator_Loaded;
            Closed += HybridMultiWindowCoordinator_Closed;

            // Initialize drag hover timer (polls every 100ms)
            _dragHoverTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(100)
            };
            _dragHoverTimer.Tick += DragHoverTimer_Tick;
        }

        private void HybridMultiWindowCoordinator_Closed(object? sender, EventArgs e)
        {
            // Clean up timer resources
            _dragHoverTimer?.Stop();
        }

        private async void HybridMultiWindowCoordinator_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Find the public folder
                _publicFolderPath = FindPublicFolder();

                if (_publicFolderPath == null)
                {
                    System.Windows.MessageBox.Show(
                        "Public folder not found. Please ensure the project is built correctly.",
                        "Initialization Error",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                    Close();
                    return;
                }

                StatusText.Text = "Opening WebView2 source window...";

                Console.WriteLine($"[Init] Creating source window...");
                // Create WebView2 source window
                await CreateSourceWindow();

                StatusText.Text = "Opening WinForms target window...";

                Console.WriteLine($"[Init] Creating target window...");
                // Create WinForms target window
                CreateTargetWindow();

                Console.WriteLine($"[Init] Both windows created successfully");
                StatusText.Text = "Both windows opened - Drag from WebView2 to WinForms!";
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(
                    $"Error initializing Hybrid Multi-Window Coordinator: {ex.Message}",
                    "Initialization Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                Close();
            }
        }

        private async Task CreateSourceWindow()
        {
            _sourceWindow = new Window
            {
                Title = "Hybrid Multi-Window - WebView2 Source",
                Width = 600,
                Height = 500,
                Left = 100,
                Top = 100,
                WindowStartupLocation = WindowStartupLocation.Manual
            };

            // Create WebView2 control
            var webView = new Microsoft.Web.WebView2.Wpf.WebView2();
            _sourceWindow.Content = webView;

            // Show the window
            _sourceWindow.Show();

            // Initialize WebView2
            await webView.EnsureCoreWebView2Async(null);

            // Set up virtual host mapping
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local",
                _publicFolderPath!,
                CoreWebView2HostResourceAccessKind.Allow);

            // Navigate to source
            webView.CoreWebView2.Navigate("https://app.local/webcomponent-table-source-html5.html");
            Console.WriteLine($"[SourceWindow] Navigated to webcomponent-table-source-html5.html");

            // Subscribe to web messages from JavaScript (for copy events)
            webView.CoreWebView2.WebMessageReceived += SourceWebView_WebMessageReceived;
            Console.WriteLine($"[SourceWindow] WebMessageReceived handler attached");

            // Handle window closing
            _sourceWindow.Closed += (s, args) =>
            {
                webView.Dispose();
            };
        }

        private void CreateTargetWindow()
        {
            _targetWindow = new System.Windows.Window
            {
                Title = "Hybrid Multi-Window - WinForms Target",
                Width = 600,
                Height = 500,
                Left = 750,
                Top = 100,
                WindowStartupLocation = WindowStartupLocation.Manual
            };

            // Create DataGridView
            _targetDataGridView = new DataGridView
            {
                Dock = DockStyle.Fill,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = true,
                AllowDrop = true,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                MultiSelect = false,
                RowHeadersVisible = true,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                BackgroundColor = Color.White,
                BorderStyle = BorderStyle.None,
                Font = new Font("Segoe UI", 10),
                ColumnHeadersHeight = 35,
                RowTemplate = { Height = 30 }
            };

            // Add columns
            _targetDataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Description",
                HeaderText = "Description",
                FillWeight = 40,
                ReadOnly = true
            });

            _targetDataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Quantity",
                HeaderText = "Qty",
                FillWeight = 15,
                ReadOnly = true,
                ValueType = typeof(int)
            });

            _targetDataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "UnitPrice",
                HeaderText = "Unit Price",
                FillWeight = 20,
                ReadOnly = true,
                ValueType = typeof(decimal),
                DefaultCellStyle = new DataGridViewCellStyle { Format = "C2" }
            });

            _targetDataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Total",
                HeaderText = "Total",
                FillWeight = 25,
                ReadOnly = true,
                ValueType = typeof(decimal),
                DefaultCellStyle = new DataGridViewCellStyle { Format = "C2" }
            });

            // Add total row
            _targetDataGridView.Rows.Add("TOTAL", DBNull.Value, DBNull.Value, 0m);
            var lastRow = _targetDataGridView.Rows[_targetDataGridView.Rows.Count - 1];
            lastRow.DefaultCellStyle.Font = new System.Drawing.Font("Segoe UI", 10, System.Drawing.FontStyle.Bold);
            lastRow.DefaultCellStyle.BackColor = Color.FromArgb(241, 245, 249);

            // Handle null/DBNull cell values during sort so typed columns (int, decimal) don't
            // throw ArgumentException when the TOTAL row's empty cells are compared.
            _targetDataGridView.SortCompare += (s, e) =>
            {
                bool v1Null = e.CellValue1 == null || e.CellValue1 == DBNull.Value;
                bool v2Null = e.CellValue2 == null || e.CellValue2 == DBNull.Value;
                if (v1Null || v2Null)
                {
                    e.SortResult = v1Null == v2Null ? 0 : v1Null ? 1 : -1;
                    e.Handled = true;
                }
            };

            // Set up drag and drop
            _targetDataGridView.DragEnter += DataGridView_DragEnter;
            _targetDataGridView.DragOver += DataGridView_DragOver;
            _targetDataGridView.DragLeave += DataGridView_DragLeave;
            _targetDataGridView.DragDrop += DataGridView_DragDrop;
            _targetDataGridView.KeyDown += DataGridView_KeyDown;
            _targetDataGridView.PreviewKeyDown += DataGridView_PreviewKeyDown;
            _targetDataGridView.MouseEnter += DataGridView_MouseEnter;

            // Create a WinForms host for the DataGridView
            var winFormsHost = new System.Windows.Forms.Integration.WindowsFormsHost
            {
                Child = _targetDataGridView
            };

            // Create a status bar for the target window
            _targetStatusText = new System.Windows.Controls.TextBlock
            {
                Text = "Ready",
                Padding = new Thickness(10, 5, 10, 5),
                Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(255, 240, 240, 240)),
                FontSize = 12
            };

            var statusBorder = new System.Windows.Controls.Border
            {
                Child = _targetStatusText,
                BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(255, 200, 200, 200)),
                BorderThickness = new Thickness(0, 1, 0, 0)
            };

            // Layout: Grid with DataGridView on top and status bar at bottom
            var grid = new System.Windows.Controls.Grid();
            grid.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = GridLength.Auto });

            System.Windows.Controls.Grid.SetRow(winFormsHost, 0);
            System.Windows.Controls.Grid.SetRow(statusBorder, 1);

            grid.Children.Add(winFormsHost);
            grid.Children.Add(statusBorder);

            _targetWindow.Content = grid;
            _targetWindow.Show();

            // Add window-level keyboard handler to catch Ctrl+V
            _targetWindow.PreviewKeyDown += TargetWindow_PreviewKeyDown;

            // Handle window closing
            _targetWindow.Closed += (s, args) =>
            {
                _targetDataGridView.Dispose();
            };
        }

        private void DataGridView_DragEnter(object? sender, System.Windows.Forms.DragEventArgs e)
        {
            if (e.Data != null && e.Data.GetDataPresent(System.Windows.Forms.DataFormats.Text))
            {
                e.Effect = System.Windows.Forms.DragDropEffects.Copy;
            }
        }

        private void DataGridView_DragOver(object? sender, System.Windows.Forms.DragEventArgs e)
        {
            if (sender is not DataGridView dataGridView) return;

            e.Effect = System.Windows.Forms.DragDropEffects.Copy;

            // Clear previous hover highlighting
            if (_dragHoverRowIndex >= 0 && _dragHoverRowIndex < dataGridView.Rows.Count - 1)
            {
                dataGridView.Rows[_dragHoverRowIndex].DefaultCellStyle.BackColor =
                    _dragHoverRowIndex % 2 == 0 ? Color.White : Color.FromArgb(250, 250, 250);
            }

            // Calculate which row the mouse is over
            var clientPoint = dataGridView.PointToClient(new System.Drawing.Point(e.X, e.Y));
            var hitTestInfo = dataGridView.HitTest(clientPoint.X, clientPoint.Y);

            if (hitTestInfo.RowIndex >= 0)
            {
                // Don't highlight the total row
                var targetRowIndex = Math.Min(hitTestInfo.RowIndex, dataGridView.Rows.Count - 2);
                _dragHoverRowIndex = targetRowIndex;

                // Highlight the row where item would be inserted
                dataGridView.Rows[targetRowIndex].DefaultCellStyle.BackColor = Color.LightBlue;
            }
            else
            {
                _dragHoverRowIndex = -1;
            }
        }

        private void DataGridView_DragLeave(object? sender, EventArgs e)
        {
            if (sender is not DataGridView dataGridView) return;

            // Clear any hover highlighting when mouse leaves the DataGridView
            if (_dragHoverRowIndex >= 0 && _dragHoverRowIndex < dataGridView.Rows.Count - 1)
            {
                dataGridView.Rows[_dragHoverRowIndex].DefaultCellStyle.BackColor =
                    _dragHoverRowIndex % 2 == 0 ? Color.White : Color.FromArgb(250, 250, 250);
            }
            _dragHoverRowIndex = -1;

            // Restore original total if showing preview
            if (_isShowingHoverPreview)
            {
                var totalRowIndex = dataGridView.Rows.Count - 1;
                dataGridView.Rows[totalRowIndex].Cells["Total"].Value = _originalGrandTotal;
                dataGridView.Rows[totalRowIndex].Cells["Total"].Style.ForeColor = Color.Black;
                _isShowingHoverPreview = false;
            }

            // Clear status bar
            if (_targetStatusText != null)
            {
                Dispatcher.Invoke(() =>
                {
                    _targetStatusText.Text = "Ready";
                });
            }
        }

        private decimal GetCurrentGrandTotal(DataGridView dataGridView)
        {
            decimal grandTotal = 0;
            var totalRowIndex = dataGridView.Rows.Count - 1;

            for (int i = 0; i < totalRowIndex; i++)
            {
                if (dataGridView.Rows[i].Cells["Total"].Value is decimal rowTotal)
                {
                    grandTotal += rowTotal;
                }
            }

            return grandTotal;
        }

        private void DataGridView_DragDrop(object? sender, System.Windows.Forms.DragEventArgs e)
        {
            if (sender is not DataGridView dataGridView) return;

            // Clear hover highlighting
            if (_dragHoverRowIndex >= 0 && _dragHoverRowIndex < dataGridView.Rows.Count - 1)
            {
                dataGridView.Rows[_dragHoverRowIndex].DefaultCellStyle.BackColor =
                    _dragHoverRowIndex % 2 == 0 ? Color.White : Color.FromArgb(250, 250, 250);
            }

            // Restore original total display (will be recalculated after drop)
            if (_isShowingHoverPreview)
            {
                var totalRowIndex = dataGridView.Rows.Count - 1;
                dataGridView.Rows[totalRowIndex].Cells["Total"].Value = _originalGrandTotal;
                dataGridView.Rows[totalRowIndex].Cells["Total"].Style.ForeColor = Color.Black;
                _isShowingHoverPreview = false;
            }

            try
            {
                // In multi-window mode, use stored drag data instead of e.Data
                string? data = null;

                if (!string.IsNullOrEmpty(_currentDragDataJson))
                {
                    // Use the stored drag data from WebView2
                    data = _currentDragDataJson;
                }
                else if (e.Data != null)
                {
                    // Fallback to standard drag data (same-window drag)
                    data = e.Data.GetData(System.Windows.Forms.DataFormats.Text) as string;
                }

                if (!string.IsNullOrEmpty(data))
                {
                    // Parse drag data
                    using var json = System.Text.Json.JsonDocument.Parse(data);
                    var root = json.RootElement;

                    var description = root.GetProperty("description").GetString() ?? "";

                    // Handle quantity - can be number or string in JSON
                    int quantity = 0;
                    var quantityProp = root.GetProperty("quantity");
                    if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                    {
                        quantity = quantityProp.GetInt32();
                    }
                    else if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        int.TryParse(quantityProp.GetString(), out quantity);
                    }

                    // Handle unitPrice - can be number or string in JSON
                    decimal unitPrice = 0;
                    var unitPriceProp = root.GetProperty("unitPrice");
                    if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                    {
                        unitPrice = unitPriceProp.GetDecimal();
                    }
                    else if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        decimal.TryParse(unitPriceProp.GetString(), out unitPrice);
                    }

                    // Determine insertion point based on mouse position
                    var clientPoint = dataGridView.PointToClient(new System.Drawing.Point(e.X, e.Y));
                    var hitTestInfo = dataGridView.HitTest(clientPoint.X, clientPoint.Y);
                    int insertIndex = hitTestInfo.RowIndex;

                    // If clicking below all rows or on total row, insert before total
                    if (insertIndex == -1 || insertIndex >= dataGridView.Rows.Count - 1)
                    {
                        insertIndex = dataGridView.Rows.Count - 1;
                    }

                    AddRowToDataGridAtIndex(dataGridView, description, quantity, unitPrice, insertIndex);
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(
                    $"Error processing drop: {ex.Message}",
                    "Drop Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
            finally
            {
                _dragHoverRowIndex = -1;
                _isShowingHoverPreview = false;
            }
        }

        private void AddRowToDataGrid(DataGridView dataGridView, string description, int quantity, decimal unitPrice)
        {
            // Insert before the total row
            var totalRowIndex = dataGridView.Rows.Count - 1;
            AddRowToDataGridAtIndex(dataGridView, description, quantity, unitPrice, totalRowIndex);
        }

        private void AddRowToDataGridAtIndex(DataGridView dataGridView, string description, int quantity, decimal unitPrice, int insertIndex)
        {
            // Calculate total for this row
            var total = quantity * unitPrice;

            // Ensure we don't insert after the total row
            var totalRowIndex = dataGridView.Rows.Count - 1;
            if (insertIndex > totalRowIndex)
            {
                insertIndex = totalRowIndex;
            }

            // Insert raw numeric values - DataGridView columns handle formatting
            dataGridView.Rows.Insert(insertIndex, description, quantity, unitPrice, total);
            var newRowIndex = insertIndex;

            UpdateGrandTotal(dataGridView);

            // Flash the new row
            dataGridView.Rows[newRowIndex].DefaultCellStyle.BackColor = Color.LightGreen;
            var timer = new System.Windows.Forms.Timer { Interval = 500 };
            timer.Tick += (s, e) =>
            {
                dataGridView.Rows[newRowIndex].DefaultCellStyle.BackColor =
                    newRowIndex % 2 == 0 ? Color.White : Color.FromArgb(250, 250, 250);
                timer.Stop();
                timer.Dispose();
            };
            timer.Start();
        }

        private void UpdateGrandTotal(DataGridView dataGridView)
        {
            decimal grandTotal = 0;
            var totalRowIndex = dataGridView.Rows.Count - 1;

            for (int i = 0; i < totalRowIndex; i++)
            {
                var cellValue = dataGridView.Rows[i].Cells["Total"].Value;
                if (cellValue != null)
                {
                    // Handle both decimal and string values
                    if (cellValue is decimal rowTotal)
                    {
                        grandTotal += rowTotal;
                    }
                    else if (decimal.TryParse(cellValue.ToString()?.Replace("$", "").Replace(",", ""), out var parsedTotal))
                    {
                        grandTotal += parsedTotal;
                    }
                }
            }

            dataGridView.Rows[totalRowIndex].Cells["Total"].Value = grandTotal;
        }

        private void DataGridView_KeyDown(object? sender, System.Windows.Forms.KeyEventArgs e)
        {
            if (sender is not DataGridView dataGridView) return;

            // Ctrl+V to paste from clipboard
            if (e.Control && e.KeyCode == Keys.V)
            {
                if (!string.IsNullOrEmpty(_copiedRowDataJson))
                {
                    try
                    {
                        var rowData = ParseRowDataFromJson(_copiedRowDataJson);

                        // Insert after selected row if one is selected, otherwise before TOTAL row
                        int totalRowIndex = dataGridView.Rows.Count - 1;
                        int insertIndex = totalRowIndex;
                        if (dataGridView.SelectedRows.Count > 0)
                        {
                            int selectedIndex = dataGridView.SelectedRows[0].Index;
                            insertIndex = Math.Min(selectedIndex + 1, totalRowIndex);
                        }

                        AddRowToDataGridAtIndex(dataGridView, rowData.Description, rowData.Quantity, rowData.UnitPrice, insertIndex);
                    }
                    catch (Exception ex)
                    {
                        System.Windows.MessageBox.Show(
                            $"Error pasting data: {ex.Message}",
                            "Paste Error",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                    }
                }
                e.Handled = true;
                return;
            }

            if (e.KeyCode == Keys.Delete && dataGridView.SelectedRows.Count > 0)
            {
                var selectedRow = dataGridView.SelectedRows[0];
                var totalRowIndex = dataGridView.Rows.Count - 1;

                // Don't allow deleting the total row
                if (selectedRow.Index != totalRowIndex)
                {
                    dataGridView.Rows.RemoveAt(selectedRow.Index);
                    UpdateGrandTotal(dataGridView);
                }
                e.Handled = true;
                e.SuppressKeyPress = true;
            }
        }

        private void DataGridView_PreviewKeyDown(object? sender, PreviewKeyDownEventArgs e)
        {
            // Mark Ctrl+V and Delete as input keys so they're passed to KeyDown event
            if ((e.Control && e.KeyCode == Keys.V) || e.KeyCode == Keys.Delete)
            {
                e.IsInputKey = true;
            }
        }

        private void DragHoverTimer_Tick(object? sender, EventArgs e)
        {
            // Poll mouse position and update hover status if over target DataGridView
            if (!_isDragging || _targetDataGridView == null || _targetWindow == null)
            {
                _dragHoverTimer?.Stop();
                return;
            }

            try
            {
                // Get cursor position in screen coordinates
                var cursorPos = System.Windows.Forms.Cursor.Position;

                // Get DataGridView bounds in screen coordinates
                var dgvBounds = _targetDataGridView.RectangleToScreen(_targetDataGridView.ClientRectangle);

                if (dgvBounds.Contains(cursorPos))
                {
                    // Mouse is over DataGridView - show hover preview
                    UpdateDragHoverStatus();
                }
                else
                {
                    // Mouse not over DataGridView
                    Dispatcher.Invoke(() =>
                    {
                        if (_targetStatusText != null)
                        {
                            _targetStatusText.Text = "Dragging... Move here to see preview";
                        }
                        StatusText.Text = "Dragging in progress...";
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DragHoverTimer] Error: {ex.Message}");
            }
        }

        private void DataGridView_MouseEnter(object? sender, EventArgs e)
        {
            // Give focus to DataGridView when mouse enters for keyboard shortcuts
            _targetDataGridView?.Focus();
        }

        private void UpdateDragHoverStatus()
        {
            if (!_isDragging || string.IsNullOrEmpty(_currentDragDataJson) || _targetDataGridView == null)
                return;

            try
            {
                var rowData = ParseRowDataFromJson(_currentDragDataJson);
                var newItemTotal = rowData.Quantity * rowData.UnitPrice;

                // Store original total only once when preview starts
                if (!_isShowingHoverPreview)
                {
                    _originalGrandTotal = GetCurrentGrandTotal(_targetDataGridView);
                    _isShowingHoverPreview = true;
                }

                var futureGrandTotal = _originalGrandTotal + newItemTotal;
                var previewText = $"Preview: {rowData.Description} ({rowData.Quantity} × {rowData.UnitPrice:C2} = {newItemTotal:C2}) | Grand Total: {_originalGrandTotal:C2} → {futureGrandTotal:C2}";

                Dispatcher.Invoke(() =>
                {
                    // Update the TOTAL row in the DataGridView to show preview
                    var totalRowIndex = _targetDataGridView.Rows.Count - 1;
                    _targetDataGridView.Rows[totalRowIndex].Cells["Total"].Value = futureGrandTotal;
                    _targetDataGridView.Rows[totalRowIndex].Cells["Total"].Style.ForeColor = Color.Blue; // Indicate preview

                    if (_targetStatusText != null)
                    {
                        _targetStatusText.Text = previewText;
                    }
                    StatusText.Text = $"Dragging over target...";
                });
            }
            catch (Exception ex)
            {
                // Use Console.WriteLine for visibility in both debug and release builds
                Console.WriteLine($"[DragHover] Error: {ex.Message}");
            }
        }

        private void TargetWindow_PreviewKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            // Handle Ctrl+V at window level to ensure it works
            if (e.Key == System.Windows.Input.Key.V &&
                (System.Windows.Input.Keyboard.Modifiers & System.Windows.Input.ModifierKeys.Control) == System.Windows.Input.ModifierKeys.Control &&
                !string.IsNullOrEmpty(_copiedRowDataJson) && _targetDataGridView != null)
            {
                try
                {
                    var rowData = ParseRowDataFromJson(_copiedRowDataJson);

                    // Insert after selected row if one is selected, otherwise before TOTAL row
                    int totalRowIndex = _targetDataGridView.Rows.Count - 1;
                    int insertIndex = totalRowIndex;
                    if (_targetDataGridView.SelectedRows.Count > 0)
                    {
                        int selectedIndex = _targetDataGridView.SelectedRows[0].Index;
                        insertIndex = Math.Min(selectedIndex + 1, totalRowIndex);
                    }

                    AddRowToDataGridAtIndex(_targetDataGridView, rowData.Description, rowData.Quantity, rowData.UnitPrice, insertIndex);
                    StatusText.Text = $"Pasted: {rowData.Description}";
                    e.Handled = true;
                }
                catch (Exception ex)
                {
                    StatusText.Text = $"Error pasting: {ex.Message}";
                }
            }
        }

        private void SourceWebView_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string? message = null;
                try
                {
                    message = e.TryGetWebMessageAsString();
                }
                catch (ArgumentException)
                {
                    // Message is not a string, try getting it as JSON
                    message = e.WebMessageAsJson;
                }

                if (string.IsNullOrEmpty(message))
                {
                    return;
                }

                // Parse the message (expecting JSON format)
                // Message format: {"action":"copy","description":"...","quantity":"12","unitPrice":"450"}
                // or {"action":"drop","description":"...","quantity":12,"unitPrice":450} for double-click
                using var json = System.Text.Json.JsonDocument.Parse(message);
                var root = json.RootElement;

                if (root.TryGetProperty("action", out var actionProp))
                {
                    var action = actionProp.GetString();

                    if (action == "copy")
                    {
                        // Store the clipboard data so the WinForms target can paste it
                        _copiedRowDataJson = message;

                        Dispatcher.Invoke(() =>
                        {
                            StatusText.Text = "Row copied - Switch to target window and press Ctrl+V to paste";
                        });
                    }
                    else if (action == "dragstart")
                    {
                        // Store the drag data so hover tracking can show the preview
                        _currentDragDataJson = message;
                        _isDragging = true;

                        // Start the drag hover timer
                        _dragHoverTimer?.Start();

                        Dispatcher.Invoke(() =>
                        {
                            if (_targetStatusText != null)
                            {
                                _targetStatusText.Text = "Drag item over this window to see preview";
                            }
                            StatusText.Text = "Drag started - move over target window";
                        });
                    }
                    else if (action == "dragend")
                    {
                        _isDragging = false;

                        // Stop the timer
                        _dragHoverTimer?.Stop();

                        // Restore original total if showing preview
                        if (_isShowingHoverPreview && _targetDataGridView != null)
                        {
                            var totalRowIndex = _targetDataGridView.Rows.Count - 1;
                            _targetDataGridView.Rows[totalRowIndex].Cells["Total"].Value = _originalGrandTotal;
                            _targetDataGridView.Rows[totalRowIndex].Cells["Total"].Style.ForeColor = Color.Black;
                            _isShowingHoverPreview = false;
                        }

                        Dispatcher.Invoke(() =>
                        {
                            if (_targetStatusText != null)
                            {
                                _targetStatusText.Text = "Ready";
                            }
                            StatusText.Text = "Ready";
                        });
                    }
                    else if (action == "drop" && _targetDataGridView != null)
                    {
                        // Handle double-click in source - add directly to target
                        var rowData = ParseRowDataFromJson(message);

                        // Invoke on UI thread
                        Dispatcher.Invoke(() =>
                        {
                            try
                            {
                                AddRowToDataGrid(_targetDataGridView, rowData.Description, rowData.Quantity, rowData.UnitPrice);
                                StatusText.Text = $"Added: {rowData.Description}";
                            }
                            catch (Exception addEx)
                            {
                                StatusText.Text = $"Error adding: {addEx.Message}";
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Use Console.WriteLine for visibility in both debug and release builds
                Console.WriteLine($"[WebMessage] Error processing message: {ex}");
                Dispatcher.Invoke(() =>
                {
                    StatusText.Text = $"Error: {ex.Message}";
                });
            }
        }

        /// <summary>
        /// Parses row data from JSON string with robust error handling
        /// </summary>
        /// <param name="jsonString">JSON string containing row data</param>
        /// <returns>Parsed row data</returns>
        /// <exception cref="FormatException">Thrown when JSON is invalid or missing required properties</exception>
        private static RowData ParseRowDataFromJson(string jsonString)
        {
            using var json = System.Text.Json.JsonDocument.Parse(jsonString);
            var root = json.RootElement;

            // Use TryGetProperty for better error handling
            if (!root.TryGetProperty("description", out var descProp))
            {
                throw new FormatException("Missing 'description' property in JSON");
            }
            var description = descProp.GetString() ?? "";

            if (!root.TryGetProperty("quantity", out var quantityProp))
            {
                throw new FormatException("Missing 'quantity' property in JSON");
            }

            // Handle quantity - can be number or string in JSON
            int quantity = 0;
            if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.Number)
            {
                quantity = quantityProp.GetInt32();
            }
            else if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                if (!int.TryParse(quantityProp.GetString(), out quantity))
                {
                    throw new FormatException($"Invalid quantity value: {quantityProp.GetString()}");
                }
            }
            else
            {
                throw new FormatException($"Quantity must be a number or string, got {quantityProp.ValueKind}");
            }

            if (!root.TryGetProperty("unitPrice", out var unitPriceProp))
            {
                throw new FormatException("Missing 'unitPrice' property in JSON");
            }

            // Handle unitPrice - can be number or string in JSON
            decimal unitPrice = 0;
            if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.Number)
            {
                unitPrice = unitPriceProp.GetDecimal();
            }
            else if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                if (!decimal.TryParse(unitPriceProp.GetString(), out unitPrice))
                {
                    throw new FormatException($"Invalid unit price value: {unitPriceProp.GetString()}");
                }
            }
            else
            {
                throw new FormatException($"UnitPrice must be a number or string, got {unitPriceProp.ValueKind}");
            }

            return new RowData
            {
                Description = description,
                Quantity = quantity,
                UnitPrice = unitPrice
            };
        }

        private string? FindPublicFolder()
        {
            // Search for the public folder in multiple locations
            var searchPaths = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "public"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "public"),
                Path.Combine(AppContext.BaseDirectory, "public"),
                Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "public"),
                Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "public")
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
    }
}
