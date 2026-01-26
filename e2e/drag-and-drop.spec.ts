import { test, expect } from '@playwright/test';

test.describe('iframe Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the parent page
    await page.goto('/');
    
    // Wait for iframes to load
    await page.waitForLoadState('networkidle');
  });

  test('should redirect to parent.html from root', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to parent.html
    await expect(page).toHaveURL(/.*parent\.html/);
    await expect(page).toHaveTitle('Drag & Drop Between iFrames - Parent');
  });

  test('should display parent page with two iframes', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /Drag & Drop Between iFrames Demo/i })).toBeVisible();
    
    // Check both iframes are present
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    await expect(frameA.getByRole('heading', { name: /Draggable Items/i })).toBeVisible();
    await expect(frameB.getByRole('heading', { name: /Drop Zones/i })).toBeVisible();
  });

  test('should display draggable items in Frame A', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    
    // Check all draggable items are present
    await expect(frameA.getByText('🎨Design Asset')).toBeVisible();
    await expect(frameA.getByText('📝Documentation')).toBeVisible();
    await expect(frameA.getByText('💻Code Module')).toBeVisible();
    await expect(frameA.getByText('🎯Task Item')).toBeVisible();
    await expect(frameA.getByText('🔧Configuration')).toBeVisible();
  });

  test('should display drop zones in Frame B', async ({ page }) => {
    const frameB = page.frameLocator('#frame-b');
    
    // Check all drop zones are present
    await expect(frameB.getByText('📋 To Do')).toBeVisible();
    await expect(frameB.getByText('🚀 In Progress')).toBeVisible();
    await expect(frameB.getByText('✅ Done')).toBeVisible();
  });

  test('should drag and drop Design Asset to To Do zone', async ({ page }) => {
    const frameA = page.frameLocator('#frame-a');
    const frameB = page.frameLocator('#frame-b');
    
    // Get references to iframe elements for coordinate calculation
    const frameAElement = page.locator('#frame-a');
    const frameBElement = page.locator('#frame-b');
    
    // Get the draggable element in Frame A
    const draggableDoc = await frameAElement.contentFrame();
    const draggable = draggableDoc!.locator('.draggable').first();
    
    // Get the To Do drop zone in Frame B
    const dropZoneDoc = await frameBElement.contentFrame();
    const dropZone = dropZoneDoc!.locator('.drop-zone').first();
    
    // Simulate drag and drop using pointer events
    await simulateDragAndDrop(page, frameAElement, frameBElement, draggable, dropZone);
    
    // Verify the item was dropped
    const droppedItem = frameB.locator('.dropped-item', { hasText: '🎨Design Asset' });
    await expect(droppedItem).toBeVisible();
  });

  test('should drag and drop Documentation to In Progress zone', async ({ page }) => {
    const frameB = page.frameLocator('#frame-b');
    
    const frameAElement = page.locator('#frame-a');
    const frameBElement = page.locator('#frame-b');
    
    const draggableDoc = await frameAElement.contentFrame();
    const draggable = draggableDoc!.locator('.draggable').nth(1); // Documentation
    
    const dropZoneDoc = await frameBElement.contentFrame();
    const dropZone = dropZoneDoc!.locator('.drop-zone').nth(1); // In Progress
    
    await simulateDragAndDrop(page, frameAElement, frameBElement, draggable, dropZone);
    
    const droppedItem = frameB.locator('.dropped-item', { hasText: '📝Documentation' });
    await expect(droppedItem).toBeVisible();
  });

  test('should drag and drop Code Module to Done zone', async ({ page }) => {
    const frameB = page.frameLocator('#frame-b');
    
    const frameAElement = page.locator('#frame-a');
    const frameBElement = page.locator('#frame-b');
    
    const draggableDoc = await frameAElement.contentFrame();
    const draggable = draggableDoc!.locator('.draggable').nth(2); // Code Module
    
    const dropZoneDoc = await frameBElement.contentFrame();
    const dropZone = dropZoneDoc!.locator('.drop-zone').nth(2); // Done
    
    await simulateDragAndDrop(page, frameAElement, frameBElement, draggable, dropZone);
    
    const droppedItem = frameB.locator('.dropped-item', { hasText: '💻Code Module' });
    await expect(droppedItem).toBeVisible();
  });

  test('should drag and drop multiple items to different zones', async ({ page }) => {
    const frameB = page.frameLocator('#frame-b');
    
    const frameAElement = page.locator('#frame-a');
    const frameBElement = page.locator('#frame-b');
    
    const draggableDoc = await frameAElement.contentFrame();
    const dropZoneDoc = await frameBElement.contentFrame();
    
    // Drop Design Asset to To Do
    await simulateDragAndDrop(
      page,
      frameAElement,
      frameBElement,
      draggableDoc!.locator('.draggable').nth(0),
      dropZoneDoc!.locator('.drop-zone').nth(0)
    );
    
    // Drop Documentation to In Progress
    await simulateDragAndDrop(
      page,
      frameAElement,
      frameBElement,
      draggableDoc!.locator('.draggable').nth(1),
      dropZoneDoc!.locator('.drop-zone').nth(1)
    );
    
    // Drop Code Module to Done
    await simulateDragAndDrop(
      page,
      frameAElement,
      frameBElement,
      draggableDoc!.locator('.draggable').nth(2),
      dropZoneDoc!.locator('.drop-zone').nth(2)
    );
    
    // Verify all items were dropped
    await expect(frameB.locator('.dropped-item', { hasText: '🎨Design Asset' })).toBeVisible();
    await expect(frameB.locator('.dropped-item', { hasText: '📝Documentation' })).toBeVisible();
    await expect(frameB.locator('.dropped-item', { hasText: '💻Code Module' })).toBeVisible();
  });

  test('should show drag preview when dragging', async ({ page }) => {
    const frameAElement = page.locator('#frame-a');
    const draggableDoc = await frameAElement.contentFrame();
    const draggable = draggableDoc!.locator('.draggable').first();
    
    // Start drag
    const box = await draggable.boundingBox();
    if (!box) throw new Error('Draggable element not found');
    
    const frameABox = await frameAElement.boundingBox();
    if (!frameABox) throw new Error('Frame A not found');
    
    await page.evaluate(async ({ frameABox, box }) => {
      const frameA = document.getElementById('frame-a') as HTMLIFrameElement;
      const draggableDoc = frameA.contentDocument!;
      const draggable = draggableDoc.querySelector('.draggable') as HTMLElement;
      
      // Trigger pointerdown
      const downEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
        pointerType: 'mouse',
        isPrimary: true
      });
      draggable.dispatchEvent(downEvent);
      
      // Trigger pointermove to start drag
      await new Promise(resolve => setTimeout(resolve, 50));
      const moveEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: box.x + box.width / 2 + 10,
        clientY: box.y + box.height / 2 + 10,
        pointerType: 'mouse',
        isPrimary: true
      });
      draggableDoc.dispatchEvent(moveEvent);
    }, { frameABox, box });
    
    // Wait for drag preview to appear
    await page.waitForTimeout(200);
    
    // Check that drag preview exists
    const dragPreview = page.locator('.drag-preview');
    await expect(dragPreview).toBeVisible();
    await expect(dragPreview).toContainText('Design Asset');
    
    // Clean up - trigger pointerup
    await page.evaluate(() => {
      const upEvent = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true
      });
      document.dispatchEvent(upEvent);
    });
  });
});

/**
 * Helper function to simulate drag and drop between iframes
 */
async function simulateDragAndDrop(
  page: any,
  frameAElement: any,
  frameBElement: any,
  draggable: any,
  dropZone: any
) {
  await page.evaluate(async ({ frameAId, frameBId, draggableIndex, dropZoneIndex }) => {
    const frameA = document.getElementById(frameAId) as HTMLIFrameElement;
    const frameB = document.getElementById(frameBId) as HTMLIFrameElement;
    
    const draggableDoc = frameA.contentDocument!;
    const draggables = draggableDoc.querySelectorAll('.draggable');
    const draggable = draggables[draggableIndex] as HTMLElement;
    
    const dropZoneDoc = frameB.contentDocument!;
    const dropZones = dropZoneDoc.querySelectorAll('.drop-zone');
    const dropZone = dropZones[dropZoneIndex] as HTMLElement;
    
    const draggableRect = draggable.getBoundingClientRect();
    const frameARect = frameA.getBoundingClientRect();
    
    const dropZoneRect = dropZone.getBoundingClientRect();
    const frameBRect = frameB.getBoundingClientRect();
    
    const endX = frameBRect.left + dropZoneRect.left + dropZoneRect.width / 2;
    const endY = frameBRect.top + dropZoneRect.top + dropZoneRect.height / 2;
    
    const pointerId = Math.floor(Math.random() * 1000);
    
    // Pointer down on draggable
    const pointerDownEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: pointerId,
      clientX: draggableRect.left + draggableRect.width / 2,
      clientY: draggableRect.top + draggableRect.height / 2,
      pointerType: 'mouse',
      isPrimary: true
    });
    draggable.dispatchEvent(pointerDownEvent);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Pointer move to trigger drag start
    const pointerMoveEvent1 = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: pointerId,
      clientX: draggableRect.left + draggableRect.width / 2 + 10,
      clientY: draggableRect.top + draggableRect.height / 2 + 10,
      pointerType: 'mouse',
      isPrimary: true
    });
    draggableDoc.dispatchEvent(pointerMoveEvent1);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Pointer move to drop zone
    const pointerMoveEvent2 = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: pointerId,
      clientX: endX,
      clientY: endY,
      pointerType: 'mouse',
      isPrimary: true
    });
    document.dispatchEvent(pointerMoveEvent2);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Pointer up on drop zone
    const pointerUpEvent = new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: pointerId,
      clientX: endX,
      clientY: endY,
      pointerType: 'mouse',
      isPrimary: true
    });
    document.dispatchEvent(pointerUpEvent);
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }, {
    frameAId: 'frame-a',
    frameBId: 'frame-b',
    draggableIndex: await draggable.evaluate((el: any) => {
      const parent = el.parentElement;
      return Array.from(parent.children).indexOf(el);
    }),
    dropZoneIndex: await dropZone.evaluate((el: any) => {
      const parent = el.parentElement;
      return Array.from(parent.children).indexOf(el);
    })
  });
  
  // Wait for the drop animation
  await page.waitForTimeout(400);
}
