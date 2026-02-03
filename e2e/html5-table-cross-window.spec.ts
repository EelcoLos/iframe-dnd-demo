import { test, expect } from '@playwright/test';

test.describe('HTML5 Table Cross-Window Drag and Drop', () => {
  test('should drop item at correct row position when dragging from frame-b to frame-a', async ({ page, context }) => {
    // Open the coordinator page
    await page.goto('/iframe-dnd-demo/parent-windows.html');
    await page.waitForLoadState('networkidle');
    
    // Open source table (frame-b-table-html5)
    const [sourceTablePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-frame-a-table-html5')
    ]);
    await sourceTablePage.waitForLoadState('networkidle');
    expect(sourceTablePage.url()).toContain('window-frame-b-table-html5.html');
    
    // Open target table (frame-a-table-html5)
    const [targetTablePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-frame-b-table-html5')
    ]);
    await targetTablePage.waitForLoadState('networkidle');
    expect(targetTablePage.url()).toContain('window-frame-a-table-html5.html');
    
    // Get initial row count in target table
    const initialRowCount = await targetTablePage.evaluate(() => {
      return document.querySelectorAll('tbody .data-row').length;
    });
    
    // Get the descriptions of rows in target table before drop
    const initialDescriptions = await targetTablePage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody .data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    // Perform HTML5 drag and drop from source to target
    // We need to simulate this at a lower level since HTML5 drag/drop doesn't work across pages in Playwright
    // Instead, we'll use the postMessage mechanism that the app already uses
    
    // Simulate drag start in source
    await sourceTablePage.evaluate(() => {
      const firstRow = document.querySelector('tbody tr.candidate-row') as HTMLElement;
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      
      // Set up data transfer
      const rowData = {
        id: firstRow.dataset.id,
        description: firstRow.dataset.description,
        quantity: firstRow.dataset.quantity,
        unitPrice: firstRow.dataset.unitPrice
      };
      
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          dropEffect: '',
          items: [],
          types: ['application/json'],
          files: [],
          setData: function(type: string, data: string) {
            this._data = this._data || {};
            this._data[type] = data;
          },
          getData: function(type: string) {
            return this._data?.[type] || '';
          },
          clearData: function() {},
          setDragImage: function() {}
        }
      });
      
      dragStartEvent.dataTransfer!.setData('application/json', JSON.stringify(rowData));
      firstRow.dispatchEvent(dragStartEvent);
    });
    
    // Wait for drag start message to propagate
    await page.waitForTimeout(200);
    
    // Simulate drop on the first row of target table (should insert before it)
    const dropResult = await targetTablePage.evaluate(() => {
      const tbody = document.getElementById('table-body') as HTMLElement;
      const firstDataRow = tbody.querySelector('.data-row') as HTMLElement;
      
      // Get the row data from the dragged item (simulating cross-window data)
      const rowData = {
        id: 'candidate-1',
        description: 'Electrical Wiring',
        quantity: '1',
        unitPrice: '4500'
      };
      
      // Create a drop event at the position of the first row
      const rect = firstDataRow.getBoundingClientRect();
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + 5, // Near the top of the first row
        dataTransfer: new DataTransfer()
      });
      
      // Set up data transfer with the row data
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          dropEffect: 'copy',
          items: [],
          types: ['application/json'],
          files: [],
          getData: function(type: string) {
            if (type === 'application/json') {
              return JSON.stringify(rowData);
            }
            return '';
          },
          setData: function() {},
          clearData: function() {},
          setDragImage: function() {}
        }
      });
      
      tbody.dispatchEvent(dropEvent);
      
      // Return the current order of rows after drop
      const rows = Array.from(tbody.querySelectorAll('.data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    // Wait for drop to complete
    await targetTablePage.waitForTimeout(500);
    
    // Verify that a new row was added
    const finalRowCount = await targetTablePage.evaluate(() => {
      return document.querySelectorAll('tbody .data-row').length;
    });
    expect(finalRowCount).toBe(initialRowCount + 1);
    
    // Verify the dropped item is at the beginning (before the first original row)
    expect(dropResult[0]).toBe('Electrical Wiring');
    expect(dropResult[1]).toBe(initialDescriptions[0]); // Original first row is now second
    
    // Clean up
    await sourceTablePage.close();
    await targetTablePage.close();
  });

  test('should drop item at middle row position', async ({ page, context }) => {
    // Open the coordinator page
    await page.goto('/iframe-dnd-demo/parent-windows.html');
    await page.waitForLoadState('networkidle');
    
    // Open target table only (we'll simulate the drag data)
    const [targetTablePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-frame-b-table-html5')
    ]);
    await targetTablePage.waitForLoadState('networkidle');
    
    // Get initial state
    const initialDescriptions = await targetTablePage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody .data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    // Simulate drop on the second row (should insert before the second row)
    const dropResult = await targetTablePage.evaluate(() => {
      const tbody = document.getElementById('table-body') as HTMLElement;
      const dataRows = Array.from(tbody.querySelectorAll('.data-row'));
      const secondRow = dataRows[1] as HTMLElement; // Second row
      
      const rowData = {
        id: 'test-item',
        description: 'Test Item',
        quantity: '2',
        unitPrice: '1000'
      };
      
      // Create a drop event at the position of the second row
      const rect = secondRow.getBoundingClientRect();
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + 5, // Near the top of the second row
        dataTransfer: new DataTransfer()
      });
      
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: function(type: string) {
            if (type === 'application/json') {
              return JSON.stringify(rowData);
            }
            return '';
          }
        }
      });
      
      tbody.dispatchEvent(dropEvent);
      
      // Return the current order of rows after drop
      const rows = Array.from(tbody.querySelectorAll('.data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    await targetTablePage.waitForTimeout(300);
    
    // Verify the dropped item is at position 1 (before the second original row)
    expect(dropResult[0]).toBe(initialDescriptions[0]); // First row unchanged
    expect(dropResult[1]).toBe('Test Item'); // New item inserted
    expect(dropResult[2]).toBe(initialDescriptions[1]); // Second row moved to third position
    
    await targetTablePage.close();
  });

  test('should drop item at last position when cursor is below all rows', async ({ page, context }) => {
    // Open the coordinator page
    await page.goto('/iframe-dnd-demo/parent-windows.html');
    await page.waitForLoadState('networkidle');
    
    // Open target table
    const [targetTablePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-frame-b-table-html5')
    ]);
    await targetTablePage.waitForLoadState('networkidle');
    
    // Get initial state
    const initialDescriptions = await targetTablePage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody .data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    // Simulate drop below all rows
    const dropResult = await targetTablePage.evaluate(() => {
      const tbody = document.getElementById('table-body') as HTMLElement;
      const dataRows = Array.from(tbody.querySelectorAll('.data-row'));
      const lastRow = dataRows[dataRows.length - 1] as HTMLElement;
      
      const rowData = {
        id: 'last-item',
        description: 'Last Item',
        quantity: '1',
        unitPrice: '500'
      };
      
      // Create a drop event below the last data row
      const rect = lastRow.getBoundingClientRect();
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom + 50, // Well below the last row
        dataTransfer: new DataTransfer()
      });
      
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: function(type: string) {
            if (type === 'application/json') {
              return JSON.stringify(rowData);
            }
            return '';
          }
        }
      });
      
      tbody.dispatchEvent(dropEvent);
      
      // Return the current order of rows after drop
      const rows = Array.from(tbody.querySelectorAll('.data-row'));
      return rows.map(row => (row as HTMLElement).dataset.description);
    });
    
    await targetTablePage.waitForTimeout(300);
    
    // Verify the dropped item is at the end
    const lastIndex = dropResult.length - 1;
    expect(dropResult[lastIndex]).toBe('Last Item');
    
    // Verify all original rows are still before it
    for (let i = 0; i < initialDescriptions.length; i++) {
      expect(dropResult[i]).toBe(initialDescriptions[i]);
    }
    
    await targetTablePage.close();
  });
});
