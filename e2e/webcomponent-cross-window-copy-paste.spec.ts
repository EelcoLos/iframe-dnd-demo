import { test, expect } from '@playwright/test';

test.describe('Webcomponent Multiwindow Keyboard Copy-Paste', () => {
  test('should copy row from source and paste to target immediately without race condition', async ({ page, context }) => {
    // Open the webcomponent multiwindow coordinator
    await page.goto('/iframe-dnd-demo/webview2-multiwindow-coordinator.html');
    await page.waitForLoadState('networkidle');

    // Open source window (Available Items)
    const [sourcePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-source-table')
    ]);
    await sourcePage.waitForLoadState('networkidle');

    // Open target window (Construction Calc)
    const [targetPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-target-table')
    ]);
    await targetPage.waitForLoadState('networkidle');

    // Click first row in source to select it
    await sourcePage.evaluate(() => {
      const firstRow = document.querySelector('#itemsTable tr') as HTMLElement;
      if (firstRow) firstRow.click();
    });

    // Get initial row count in target
    const initialRowCount = await targetPage.evaluate(() => {
      return document.querySelectorAll('#calcTable .data-row').length;
    });

    // Press Ctrl+C in source window immediately (before BroadcastChannel test completes, ~200ms)
    // This tests that localStorage provides data without waiting for async broadcast
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
    });

    // Immediately press Ctrl+V in target window – no waiting, simulating the race condition
    await targetPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
    });

    // Wait for the DOM to update rather than using a fixed timeout
    const expectedCount = initialRowCount + 1;
    await targetPage.waitForFunction(
      (count) => document.querySelectorAll('#calcTable .data-row').length >= count,
      expectedCount
    );

    // Verify a new row was added (first paste must work)
    const finalRowCount = await targetPage.evaluate(() => {
      return document.querySelectorAll('#calcTable .data-row').length;
    });

    expect(finalRowCount).toBe(initialRowCount + 1);

    await sourcePage.close();
    await targetPage.close();
  });

  test('should paste the most recently copied row, not a previously copied row', async ({ page, context }) => {
    // Open coordinator
    await page.goto('/iframe-dnd-demo/webview2-multiwindow-coordinator.html');
    await page.waitForLoadState('networkidle');

    // Open source window
    const [sourcePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-source-table')
    ]);
    await sourcePage.waitForLoadState('networkidle');

    // Open target window
    const [targetPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-target-table')
    ]);
    await targetPage.waitForLoadState('networkidle');

    // Get descriptions of first two rows in source
    const rowDescriptions = await sourcePage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#itemsTable tr'));
      return rows.map(row => (row as HTMLElement).dataset.desc).filter(Boolean);
    });

    // Copy first row
    await sourcePage.evaluate(() => {
      const firstRow = document.querySelector('#itemsTable tr') as HTMLElement;
      if (firstRow) firstRow.click();
    });
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    });

    // Copy second row (replaces first in clipboard)
    await sourcePage.evaluate(() => {
      const rows = document.querySelectorAll('#itemsTable tr');
      if (rows[1]) (rows[1] as HTMLElement).click();
    });
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    });

    // Paste in target – should get the SECOND (most recently copied) row
    const initialCount = await targetPage.evaluate(() => document.querySelectorAll('#calcTable .data-row').length);
    await targetPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    });

    // Wait for the row to appear
    await targetPage.waitForFunction(
      (count) => document.querySelectorAll('#calcTable .data-row').length > count,
      initialCount
    );

    // Get description of the pasted row
    const pastedDescription = await targetPage.evaluate(() => {
      const rows = document.querySelectorAll('#calcTable .data-row');
      if (rows.length === 0) return null;
      return (rows[rows.length - 1] as HTMLElement).dataset.desc;
    });

    // Must be the second row's description, not the first
    expect(pastedDescription).toBe(rowDescriptions[1]);

    await sourcePage.close();
    await targetPage.close();
  });

  test('should paste row after selected row in target, not always at bottom', async ({ page, context }) => {
    // Open coordinator
    await page.goto('/iframe-dnd-demo/webview2-multiwindow-coordinator.html');
    await page.waitForLoadState('networkidle');

    // Open source window
    const [sourcePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-source-table')
    ]);
    await sourcePage.waitForLoadState('networkidle');

    // Open target window
    const [targetPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#open-target-table')
    ]);
    await targetPage.waitForLoadState('networkidle');

    // Paste row 1 into target
    await sourcePage.evaluate(() => {
      const rows = document.querySelectorAll('#itemsTable tr');
      if (rows[0]) (rows[0] as HTMLElement).click();
    });
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    });
    await targetPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    });
    await targetPage.waitForFunction(() => document.querySelectorAll('#calcTable .data-row').length >= 1);

    // Paste row 2 into target
    await sourcePage.evaluate(() => {
      const rows = document.querySelectorAll('#itemsTable tr');
      if (rows[1]) (rows[1] as HTMLElement).click();
    });
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    });
    await targetPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    });
    await targetPage.waitForFunction(() => document.querySelectorAll('#calcTable .data-row').length >= 2);

    // Target now has 2 rows. Select the FIRST row in target
    await targetPage.evaluate(() => {
      const firstRow = document.querySelector('#calcTable .data-row') as HTMLElement;
      if (firstRow) firstRow.click();
    });

    // Copy row 3 from source
    await sourcePage.evaluate(() => {
      const rows = document.querySelectorAll('#itemsTable tr');
      if (rows[2]) (rows[2] as HTMLElement).click();
    });
    await sourcePage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    });

    // Get the description of what we're about to paste
    const thirdRowDesc = await sourcePage.evaluate(() => {
      const rows = document.querySelectorAll('#itemsTable tr');
      return (rows[2] as HTMLElement)?.dataset.desc ?? null;
    });

    // Paste in target after the selected first row
    await targetPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    });
    await targetPage.waitForFunction(() => document.querySelectorAll('#calcTable .data-row').length >= 3);

    // The target should have 3 rows. The new row should be at index 1 (after selected row 0)
    const rowOrder = await targetPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#calcTable .data-row'));
      return rows.map(r => (r as HTMLElement).dataset.desc);
    });

    expect(rowOrder).toHaveLength(3);
    // The pasted row should be at position 1 (after the first/selected row), not at position 2 (end)
    expect(rowOrder[1]).toBe(thirdRowDesc);
  });
});
