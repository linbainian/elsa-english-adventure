import { test, expect } from '@playwright/test';

test('艾莎造型：切关更换真实人物与头像，换装关保留完整原版脸和服装层', async ({ page }) => {
  const missing: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) missing.push(response.url()); });
  await page.goto('/');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
  for (const [level, look] of [[2, 'garden'], [3, 'spring'], [6, 'winter'], [5, 'wardrobe'], [7, 'garden'], [1, 'ice']] as const) {
    await page.locator(`[data-action="select-level"][data-level="${level}"]`).click();
    await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-look', look);
    await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-frame-width', '1024');
    const portraitLook = look === 'wardrobe' ? 'ice' : look;
    const head = page.locator('#dialogue .elsa-portrait');
    await expect(head).toHaveAttribute('src', `/assets/elsa-looks/${portraitLook}-portrait.png`);
    await expect.poll(() => head.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(256);
    const bounds = await head.boundingBox();
    const frame = await page.locator('.npc-portrait').boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(frame!.width);
    expect(bounds!.height).toBeLessThanOrEqual(frame!.height);
    if (look === 'wardrobe') {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-look', 'casual');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-portrait-frame-width', '1024');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-texture', 'theme-wardrobe/outfit-casual');
    } else if (look !== 'ice') {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-texture', 'elsa-' + look);
      await expect(page.locator('#game-frame')).not.toHaveAttribute('data-look');
    }
  }
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});
