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

            // Handle key press for delete
            _dataGridView.KeyDown += DataGridView_KeyDown;

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
                var message = e.TryGetWebMessageAsString();

                // Parse the message (expecting JSON format)
                // Message format: {"action":"drop","description":"...","quantity":12,"unitPrice":450}
                if (!string.IsNullOrEmpty(message))
                {
                    var json = System.Text.Json.JsonDocument.Parse(message);
                    var root = json.RootElement;

                    if (root.TryGetProperty("action", out var actionProp) && actionProp.GetString() == "drop")
                    {
                        var description = root.GetProperty("description").GetString() ?? "";
                        var quantity = root.GetProperty("quantity").GetInt32();
                        var unitPrice = root.GetProperty("unitPrice").GetDecimal();

                        AddRowToDataGrid(description, quantity, unitPrice);
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

            // Create a new row with the data
            var newRow = new DataGridViewRow();
            newRow.Cells.AddRange(
                new DataGridViewTextBoxCell { Value = description },
                new DataGridViewTextBoxCell { Value = quantity },
                new DataGridViewTextBoxCell { Value = unitPrice },
                new DataGridViewTextBoxCell { Value = total }
            );

            // Insert before the total row
            var totalRowIndex = _dataGridView.Rows.Count - 1;
            _dataGridView.Rows.Insert(totalRowIndex, newRow);
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
                    var json = System.Text.Json.JsonDocument.Parse(data);
                    var root = json.RootElement;

                    var description = root.GetProperty("description").GetString() ?? "";
                    var quantity = root.GetProperty("quantity").GetInt32();
                    var unitPrice = root.GetProperty("unitPrice").GetDecimal();

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
