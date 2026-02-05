using System;
using System.Drawing;
using System.IO;
using System.Windows;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

namespace WebView2App
{
    /// <summary>
    /// Hybrid Multi-Window Coordinator
    /// Opens separate WebView2 (source) and WinForms (target) windows for drag-and-drop
    /// </summary>
    public partial class HybridMultiWindowCoordinator : Window
    {
        private string? _publicFolderPath;
        private Window? _sourceWindow;
        private Window? _targetWindow;

        public HybridMultiWindowCoordinator()
        {
            InitializeComponent();
            Loaded += HybridMultiWindowCoordinator_Loaded;
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

                // Create WebView2 source window
                await CreateSourceWindow();

                StatusText.Text = "Opening WinForms target window...";

                // Create WinForms target window
                CreateTargetWindow();

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
            var dataGridView = new DataGridView
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
            dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Description",
                HeaderText = "Description",
                FillWeight = 40,
                ReadOnly = true
            });

            dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Quantity",
                HeaderText = "Qty",
                FillWeight = 15,
                ReadOnly = true
            });

            dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "UnitPrice",
                HeaderText = "Unit Price",
                FillWeight = 20,
                ReadOnly = true
            });

            dataGridView.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "Total",
                HeaderText = "Total",
                FillWeight = 25,
                ReadOnly = true
            });

            // Add total row
            dataGridView.Rows.Add("TOTAL", "", "", "0.00");
            var lastRow = dataGridView.Rows[dataGridView.Rows.Count - 1];
            lastRow.DefaultCellStyle.Font = new System.Drawing.Font("Segoe UI", 10, System.Drawing.FontStyle.Bold);
            lastRow.DefaultCellStyle.BackColor = Color.FromArgb(241, 245, 249);

            // Set up drag and drop
            dataGridView.DragEnter += DataGridView_DragEnter;
            dataGridView.DragDrop += DataGridView_DragDrop;
            dataGridView.KeyDown += DataGridView_KeyDown;

            // Create a WinForms host for the DataGridView
            var winFormsHost = new System.Windows.Forms.Integration.WindowsFormsHost
            {
                Child = dataGridView
            };

            _targetWindow.Content = winFormsHost;
            _targetWindow.Show();

            // Handle window closing
            _targetWindow.Closed += (s, args) =>
            {
                dataGridView.Dispose();
            };
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
            if (e.Data == null || sender is not DataGridView dataGridView) return;

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

                    AddRowToDataGrid(dataGridView, description, quantity, unitPrice);
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
        }

        private void AddRowToDataGrid(DataGridView dataGridView, string description, int quantity, decimal unitPrice)
        {
            // Calculate total for this row
            var total = quantity * unitPrice;

            // Insert before the total row
            var totalRowIndex = dataGridView.Rows.Count - 1;
            var newRowIndex = dataGridView.Rows.Add(description, quantity, unitPrice, total);
            
            // Move the new row before the total row
            if (newRowIndex == totalRowIndex + 1)
            {
                var row = dataGridView.Rows[newRowIndex];
                dataGridView.Rows.Remove(row);
                dataGridView.Rows.Insert(totalRowIndex, row);
                newRowIndex = totalRowIndex;
            }

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
                if (dataGridView.Rows[i].Cells["Total"].Value is decimal rowTotal)
                {
                    grandTotal += rowTotal;
                }
            }

            dataGridView.Rows[totalRowIndex].Cells["Total"].Value = grandTotal;
        }

        private void DataGridView_KeyDown(object? sender, System.Windows.Forms.KeyEventArgs e)
        {
            if (sender is not DataGridView dataGridView) return;

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
            }
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
