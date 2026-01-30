import { test, expect } from '@playwright/test';

test.describe('Table Keyboard Copy-Paste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe-dnd-demo/parent.html');
    await page.waitForLoadState('networkidle');
    
    // Switch to table demo
    await page.evaluate(() => {
      const button = document.querySelector('button[data-demo="table"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.waitForTimeout(500);
  });

  test('should copy row from Frame B and paste to Frame A', async ({ page }) => {
    const frameAElement = page.locator('#frame-a');
    const frameBElement = page.locator('#frame-b');
    
    // Step 1: Click a row in Frame B to select it
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const firstRow = frameBDoc.querySelector('tbody tr');
      if (firstRow) {
        (firstRow as HTMLElement).click();
      }
    });
    
    await page.waitForTimeout(100);
    
    // Step 2: Get the description of the selected row
    const selectedRowText = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const selectedRow = frameBDoc.querySelector('tbody tr.selected');
      return selectedRow?.textContent || '';
    });
    
    expect(selectedRowText.length).toBeGreaterThan(0);
    
    // Step 3: Copy the row (Ctrl+C) in Frame B
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(200);
    
    // Step 4: Get initial row count in Frame A
    const initialRowCount = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      return frameADoc.querySelectorAll('tbody tr.data-row').length;
    });
    
    // Step 5: Paste in Frame A (Ctrl+V)
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      const event = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Verify a new row was added
    const finalRowCount = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      return frameADoc.querySelectorAll('tbody tr.data-row').length;
    });
    
    expect(finalRowCount).toBe(initialRowCount + 1);
  });

  test('should copy row from Frame B and paste to Frame B', async ({ page }) => {
    // Step 1: Click a row in Frame B to select it
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const firstRow = frameBDoc.querySelector('tbody tr');
      if (firstRow) {
        (firstRow as HTMLElement).click();
      }
    });
    
    await page.waitForTimeout(100);
    
    // Step 2: Copy the row (Ctrl+C) in Frame B
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(200);
    
    // Step 3: Get initial row count in Frame B
    const initialRowCount = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      return frameBDoc.querySelectorAll('tbody tr').length;
    });
    
    // Step 4: Paste in Frame B (Ctrl+V)
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const event = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Verify a new row was added
    const finalRowCount = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      return frameBDoc.querySelectorAll('tbody tr').length;
    });
    
    expect(finalRowCount).toBe(initialRowCount + 1);
  });
});
