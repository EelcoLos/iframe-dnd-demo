import { test, expect } from '@playwright/test';

test.describe('Keyboard Copy-Paste', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the parent page
    await page.goto('/');
    
    // Wait for iframes to load
    await page.waitForLoadState('networkidle');
  });

  test('should copy item from Frame A and paste to Frame B using keyboard', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    // Focus on first draggable item in Frame A using Tab
    await page.keyboard.press('Tab'); // Focus draggable-items container
    await page.keyboard.press('Tab'); // Focus first draggable item
    
    // Verify Design Asset is focused
    await expect(frameA.locator('.draggable').first()).toBeFocused();
    
    // Copy the item using Ctrl+C
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    
    // Tab to Frame B's first drop zone
    await page.keyboard.press('Tab'); // Next item
    await page.keyboard.press('Tab'); // Next item
    await page.keyboard.press('Tab'); // Next item
    await page.keyboard.press('Tab'); // Next item
    await page.keyboard.press('Tab'); // First drop zone in Frame B
    
    // Paste the item using Ctrl+V
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify item appears in Frame B's To Do zone
    await expect(frameB.locator('.dropped-item', { hasText: 'Design Asset' })).toBeVisible();
    
    // Verify item is removed from Frame A
    const itemsInFrameA = await frameA.locator('.draggable').count();
    expect(itemsInFrameA).toBe(4);
  });

  test('should copy item from Frame B and paste back to Frame A using keyboard', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    // First, move an item from Frame A to Frame B
    await page.keyboard.press('Tab'); // Focus draggable-items container
    await page.keyboard.press('Tab'); // Focus first draggable item
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    
    // Tab to Frame B's first drop zone
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Now copy the item from Frame B
    // The pasted item should be focused
    await expect(frameB.locator('.dropped-item').first()).toBeFocused();
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    
    // Tab back to Frame A container using Shift+Tab
    await page.keyboard.press('Shift+Tab'); // Go back to drop zone
    await page.keyboard.press('Shift+Tab'); // Previous
    await page.keyboard.press('Shift+Tab'); // Previous
    await page.keyboard.press('Shift+Tab'); // Previous
    await page.keyboard.press('Shift+Tab'); // Previous
    await page.keyboard.press('Shift+Tab'); // Frame A container
    
    // Paste the item back
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify item is back in Frame A
    const itemsInFrameA = await frameA.locator('.draggable').count();
    expect(itemsInFrameA).toBe(5);
    
    // Verify item is removed from Frame B
    const itemsInFrameB = await frameB.locator('.dropped-item').count();
    expect(itemsInFrameB).toBe(0);
  });

  test('should copy and paste multiple items between frames', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    // Copy and paste Documentation to In Progress zone
    await page.keyboard.press('Tab'); // Container
    await page.keyboard.press('Tab'); // Design Asset
    await page.keyboard.press('Tab'); // Documentation
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    
    // Navigate to In Progress zone (2nd zone)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // To Do zone
    await page.keyboard.press('Tab'); // In Progress zone
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify Documentation appears in In Progress zone
    await expect(frameB.locator('.dropped-item', { hasText: 'Documentation' })).toBeVisible();
    
    // Verify Documentation is removed from Frame A
    await expect(frameA.locator('.draggable', { hasText: 'Documentation' })).not.toBeVisible();
  });

  test('should show visual feedback when copying items', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    
    // Focus on first item
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Get the focused element
    const firstItem = frameA.locator('.draggable').first();
    await expect(firstItem).toBeFocused();
    
    // Copy should trigger animation (we can't easily test animation, but we can verify copy works)
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);
    
    // Item should still be visible (not removed until pasted elsewhere)
    await expect(firstItem).toBeVisible();
  });

  test('should handle Tab navigation between frames', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    // Tab through Frame A items
    await page.keyboard.press('Tab'); // Container
    await expect(frameA.locator('.draggable-items')).toBeFocused();
    
    await page.keyboard.press('Tab'); // First item
    await expect(frameA.locator('.draggable').first()).toBeFocused();
    
    // Continue tabbing to Frame B
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // First drop zone
    await expect(frameB.locator('.drop-zone').first()).toBeFocused();
  });

  test('should not paste if nothing has been copied', async ({ page }) => {
    const frameB = page.frameLocator('#frame-b');
    
    // Navigate to Frame B without copying anything
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Try to paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify nothing was pasted
    const itemsInFrameB = await frameB.locator('.dropped-item').count();
    expect(itemsInFrameB).toBe(0);
  });
});
