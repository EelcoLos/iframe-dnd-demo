import { test, expect } from '@playwright/test';

test.describe('Keyboard Copy-Paste', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the parent page
    await page.goto('/iframe-dnd-demo/parent.html');
    
    // Wait for iframes to load
    await page.waitForLoadState('networkidle');
  });

  test('should select item in Frame A using arrow keys', async ({ page }) => {
    // Simulate ArrowDown keypress in the iframe
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    // Wait for selection
    await page.waitForTimeout(100);
    
    // Check if first item has 'selected' class
    const isSelected = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      const firstItem = frameADoc.querySelector('.draggable');
      return firstItem?.classList.contains('selected');
    });
    
    expect(isSelected).toBe(true);
  });

  test('should copy item from Frame A and paste to Frame B', async ({ page }) => {
    // Select first item in Frame A
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Copy the selected item (Ctrl+C)
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Select first zone in Frame B
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Paste into Frame B (Ctrl+V)
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
    
    // Verify the item was pasted
    const isPasted = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const droppedItem = frameBDoc.querySelector('.dropped-item');
      return droppedItem?.textContent?.includes('Design Asset');
    });
    
    expect(isPasted).toBe(true);
    
    // Verify the item was removed from Frame A
    const itemCount = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      return frameADoc.querySelectorAll('.draggable').length;
    });
    
    expect(itemCount).toBe(4); // Should have 4 items left (started with 5)
  });

  test('should navigate through items with arrow keys', async ({ page }) => {
    // Press ArrowDown to select first item
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Get the text of the first selected item
    const firstSelectedText = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      const selected = frameADoc.querySelector('.draggable.selected');
      return selected ? selected.textContent?.trim() : null;
    });
    
    expect(firstSelectedText).toBe('🎨Design Asset');
    
    // Press ArrowDown again to move to next item
    await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameADoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Get the text of the second selected item
    const secondSelectedText = await page.evaluate(() => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const frameADoc = frameA.contentDocument!;
      const selected = frameADoc.querySelector('.draggable.selected');
      return selected ? selected.textContent?.trim() : null;
    });
    
    expect(secondSelectedText).toBe('📝Documentation');
  });

  test('should navigate through drop zones with arrow keys', async ({ page }) => {
    // Press ArrowDown to select first zone
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Check if first zone has 'selected' class
    const firstZoneSelected = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const zones = frameBDoc.querySelectorAll('.drop-zone');
      return zones[0]?.classList.contains('selected');
    });
    
    expect(firstZoneSelected).toBe(true);
    
    // Press ArrowDown again to move to next zone
    await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      });
      frameBDoc.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
    
    // Check if second zone has 'selected' class
    const secondZoneSelected = await page.evaluate(() => {
      const frameB = document.getElementById('frame-b') as HTMLIFrameElement;
      const frameBDoc = frameB.contentDocument!;
      const zones = frameBDoc.querySelectorAll('.drop-zone');
      return zones[1]?.classList.contains('selected');
    });
    
    expect(secondZoneSelected).toBe(true);
  });
});
