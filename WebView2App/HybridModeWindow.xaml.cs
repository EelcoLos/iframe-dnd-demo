using System;
using System.Drawing;
using System.IO;
using System.Windows;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

namespace WebView2App
{
    public partial class HybridModeWindow : Window
    {
        private string? _publicFolderPath;
        private DataGridView? _dataGridView;
        private string? _copiedDescription;
        private int _copiedQuantity;
        private decimal _copiedUnitPrice;
        private bool _hasCopiedData = false;

        public HybridModeWindow()
        {
            InitializeComponent();
            Loaded += HybridModeWindow_Loaded;

            // Add window-level keyboard handler to catch Ctrl+V even when DataGridView doesn't have focus
            PreviewKeyDown += HybridModeWindow_PreviewKeyDown;
        }

        private async void HybridModeWindow_Loaded(object sender, RoutedEventArgs e)
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

                StatusText.Text = $"Loading hybrid mode from: {_publicFolderPath}";

                // Initialize DataGridView
                InitializeDataGridView();

                // Initialize WebView2 control for source
                await WebViewSource.EnsureCoreWebView2Async(null);

                // Set up virtual host mapping
                WebViewSource.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "app.local",
                    _publicFolderPath,
                    CoreWebView2HostResourceAccessKind.Allow);

                // Subscribe to web messages from JavaScript
                WebViewSource.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

                // Navigate to WebView source (Web Components)
                WebViewSource.CoreWebView2.Navigate("https://app.local/webcomponent-table-source-html5.html");

                StatusText.Text = "Hybrid mode loaded - Drag from WebView source to WinForms DataGridView target";
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(
                    $"Error initializing Hybrid Mode: {ex.Message}",
                    "Initialization Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                Close();
            }
        }

        private void InitializeDataGridView()
        {
            _dataGridView = new DataGridView
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
            _dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Description",
                HeaderText = "Description",
                FillWeight = 40,
                ReadOnly = true
            });

            _dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Quantity",
                HeaderText = "Quantity",
                FillWeight = 15,
                DefaultCellStyle = { Alignment = DataGridViewContentAlignment.MiddleRight },
                ReadOnly = true
            });

            _dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "UnitPrice",
                HeaderText = "Unit Price",
                FillWeight = 15,
                DefaultCellStyle = {
                    Alignment = DataGridViewContentAlignment.MiddleRight,
                    Format = "C2"
                },
                ReadOnly = true
            });

            _dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Total",
                HeaderText = "Total",
                FillWeight = 15,
                DefaultCellStyle = {
                    Alignment = DataGridViewContentAlignment.MiddleRight,
                    Format = "C2"
                },
                ReadOnly = true
            });

            // Style the column headers
            _dataGridView.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(240, 240, 240);
            _dataGridView.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI Semibold", 10);
            _dataGridView.ColumnHeadersDefaultCellStyle.ForeColor = Color.FromArgb(60, 60, 60);
            _dataGridView.ColumnHeadersDefaultCellStyle.Padding = new Padding(5);

            // Enable alternate row colors
            _dataGridView.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(250, 250, 250);

            // Handle drag and drop events
            _dataGridView.DragEnter += DataGridView_DragEnter;
            _dataGridView.DragDrop += DataGridView_DragDrop;

            // Handle keyboard events for Ctrl+V and Delete
            _dataGridView.KeyDown += DataGridView_KeyDown;
            _dataGridView.PreviewKeyDown += DataGridView_PreviewKeyDown;

            // Handle mouse enter to give focus for keyboard shortcuts
            _dataGridView.MouseEnter += DataGridView_MouseEnter;

            // Add DataGridView to the host
            DataGridViewHost.Child = _dataGridView;

            // Add a summary row at the bottom
            AddTotalRow();
        }

        private void AddTotalRow()
        {
            if (_dataGridView == null) return;

            var totalRow = _dataGridView.Rows.Add();
            _dataGridView.Rows[totalRow].DefaultCellStyle.BackColor = Color.FromArgb(255, 251, 235);
            _dataGridView.Rows[totalRow].DefaultCellStyle.Font = new Font("Segoe UI Semibold", 10);
            _dataGridView.Rows[totalRow].Cells["Description"].Value = "TOTAL";
            _dataGridView.Rows[totalRow].Cells["Quantity"].Value = "";
            _dataGridView.Rows[totalRow].Cells["UnitPrice"].Value = "";
            _dataGridView.Rows[totalRow].Cells["Total"].Value = 0m;
            _dataGridView.Rows[totalRow].ReadOnly = true;
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string? message = null;
                try
                {
                    message = e.TryGetWebMessageAsString();
                }
                catch (ArgumentException argEx)
                {
                    // Message is not a string, try getting it as JSON
                    Console.WriteLine($"[WebMessage] TryGetWebMessageAsString failed: {argEx.Message}, retrying...");
                    message = e.WebMessageAsJson;
                    Console.WriteLine($"[WebMessage] Got message as JSON: {message}");
                }

                // Parse the message (expecting JSON format)
                // Message format: {"action":"drop","description":"...","quantity":12,"unitPrice":450}
                // or {"action":"copy","description":"...","quantity":"12","unitPrice":"450"}
                if (!string.IsNullOrEmpty(message))
                {
                    using var json = System.Text.Json.JsonDocument.Parse(message);
                    var root = json.RootElement;

                    if (root.TryGetProperty("action", out var actionProp))
                    {
                        var action = actionProp.GetString();

                        if (action == "drop")
                        {
                            var description = root.GetProperty("description").GetString() ?? "";
                            var quantity = root.GetProperty("quantity").GetInt32();
                            var unitPrice = root.GetProperty("unitPrice").GetDecimal();

                            AddRowToDataGrid(description, quantity, unitPrice);
                        }
                        else if (action == "copy")
                        {
                            // Store the copied data for later paste
                            _copiedDescription = root.GetProperty("description").GetString() ?? "";

                            // Handle quantity - can be number or string in JSON
                            var quantityProp = root.GetProperty("quantity");
                            if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                            {
                                _copiedQuantity = quantityProp.GetInt32();
                            }
                            else if (quantityProp.ValueKind == System.Text.Json.JsonValueKind.String)
                            {
                                int.TryParse(quantityProp.GetString(), out _copiedQuantity);
                            }

                            // Handle unitPrice - can be number or string in JSON
                            var unitPriceProp = root.GetProperty("unitPrice");
                            if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                            {
                                _copiedUnitPrice = unitPriceProp.GetDecimal();
                            }
                            else if (unitPriceProp.ValueKind == System.Text.Json.JsonValueKind.String)
                            {
                                decimal.TryParse(unitPriceProp.GetString(), out _copiedUnitPrice);
                            }

                            _hasCopiedData = true;
                            StatusText.Text = $"Copied: {_copiedDescription} - Press Ctrl+V in target to paste";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = $"Error processing message: {ex.Message}";
            }
        }

        private void AddRowToDataGrid(string description, int quantity, decimal unitPrice)
        {
            if (_dataGridView == null) return;

            // Calculate total for this row
            var total = quantity * unitPrice;

            // Insert before the total row
            var totalRowIndex = _dataGridView.Rows.Count - 1;
            _dataGridView.Rows.Insert(totalRowIndex, description, quantity, unitPrice, total);
            var newRowIndex = totalRowIndex;

            // Update grand total
            UpdateGrandTotal();

            // Flash the new row
            _dataGridView.Rows[newRowIndex].DefaultCellStyle.BackColor = Color.LightGreen;
            var timer = new System.Windows.Forms.Timer { Interval = 500 };
            timer.Tick += (s, e) =>
            {
                _dataGridView.Rows[newRowIndex].DefaultCellStyle.BackColor =
                    newRowIndex % 2 == 0 ? Color.White : Color.FromArgb(250, 250, 250);
                timer.Stop();
                timer.Dispose();
            };
            timer.Start();

            StatusText.Text = $"Added: {description} - Total: {total:C2}";
        }

        private void UpdateGrandTotal()
        {
            if (_dataGridView == null) return;

            decimal grandTotal = 0;
            var totalRowIndex = _dataGridView.Rows.Count - 1;

            for (int i = 0; i < totalRowIndex; i++)
            {
                if (_dataGridView.Rows[i].Cells["Total"].Value is decimal rowTotal)
                {
                    grandTotal += rowTotal;
                }
            }

            _dataGridView.Rows[totalRowIndex].Cells["Total"].Value = grandTotal;
        }

        private void DataGridView_DragEnter(object? sender, System.Windows.Forms.DragEventArgs e)
        {
            if (e.Data != null && e.Data.GetDataPresent(System.Windows.Forms.DataFormats.Text))
            {
                e.Effect = System.Windows.Forms.DragDropEffects.Copy;
            }
        }

        private void DataGridView_DragDrop(object? sender, System.Windows.Forms.DragEventArgs e)
        {
            if (e.Data == null) return;

            try
            {
                var data = e.Data.GetData(System.Windows.Forms.DataFormats.Text) as string;
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

                    AddRowToDataGrid(description, quantity, unitPrice);
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = $"Error processing drop: {ex.Message}";
            }
        }

        private void DataGridView_KeyDown(object? sender, KeyEventArgs e)
        {
            if (_dataGridView == null) return;

            // Handle Ctrl+V for paste
            if (e.Control && e.KeyCode == Keys.V)
            {
                if (_hasCopiedData && _copiedDescription != null)
                {
                    AddRowToDataGrid(_copiedDescription, _copiedQuantity, _copiedUnitPrice);
                    StatusText.Text = $"Pasted: {_copiedDescription}";
                }
                else
                {
                    StatusText.Text = "No data to paste - Copy a row from the source table first (Ctrl+C)";
                }
                e.Handled = true;
                e.SuppressKeyPress = true;
                return;
            }

            // Handle Delete for row removal
            if (e.KeyCode == Keys.Delete && _dataGridView.SelectedRows.Count > 0)
            {
                var selectedRow = _dataGridView.SelectedRows[0];
                var totalRowIndex = _dataGridView.Rows.Count - 1;

                // Don't allow deleting the total row
                if (selectedRow.Index != totalRowIndex)
                {
                    _dataGridView.Rows.RemoveAt(selectedRow.Index);
                    UpdateGrandTotal();
                    StatusText.Text = "Row deleted";
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

        private void DataGridView_MouseEnter(object? sender, EventArgs e)
        {
            // Give focus to DataGridView when mouse enters for keyboard shortcuts
            _dataGridView?.Focus();
        }

        private void HybridModeWindow_PreviewKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            // Handle Ctrl+V at window level to ensure it works even if DataGridView doesn't have focus
            if (e.Key == System.Windows.Input.Key.V &&
                (System.Windows.Input.Keyboard.Modifiers & System.Windows.Input.ModifierKeys.Control) == System.Windows.Input.ModifierKeys.Control)
            {
                if (_hasCopiedData && _copiedDescription != null)
                {
                    AddRowToDataGrid(_copiedDescription, _copiedQuantity, _copiedUnitPrice);
                    StatusText.Text = $"Pasted: {_copiedDescription}";
                    e.Handled = true;
                }
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
        }

        private void ForwardButton_Click(object sender, RoutedEventArgs e)
        {
            if (WebViewSource.CoreWebView2?.CanGoForward == true)
                WebViewSource.CoreWebView2.GoForward();
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            WebViewSource.CoreWebView2?.Reload();
        }

        private void DevToolsButton_Click(object sender, RoutedEventArgs e)
        {
            WebViewSource.CoreWebView2?.OpenDevToolsWindow();
        }

        private void ClearDataGridButton_Click(object sender, RoutedEventArgs e)
        {
            if (_dataGridView == null) return;

            // Remove all rows except the total row
            var totalRowIndex = _dataGridView.Rows.Count - 1;
            for (int i = totalRowIndex - 1; i >= 0; i--)
            {
                _dataGridView.Rows.RemoveAt(i);
            }

            UpdateGrandTotal();
            StatusText.Text = "Target cleared";
        }
    }
}
