import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
try {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
  const fps = await page.evaluate(() => new Promise(resolve => {
    const deltas = []; let previous = performance.now(), start = previous;
    function tick(now) {
      deltas.push(now - previous); previous = now;
      if (now - start < 3500) requestAnimationFrame(tick);
      else { deltas.sort((a, b) => a - b); resolve({ frames: deltas.length, fps: deltas.length * 1000 / (now - start), p90Ms: deltas[Math.floor(deltas.length * .9)] }); }
    }
    requestAnimationFrame(tick);
  }));
  const sizes = [];
  for (const mode of ['read', 'type', 'voice']) {
    await page.getByRole('button', { name: '冒险设置', exact: true }).click();
    await page.locator('[data-mode="' + mode + '"][data-action="set-mode"]').click();
    await page.getByRole('button', { name: '设置好了，继续冒险' }).click();
    await page.waitForTimeout(200);
    sizes.push({ mode, frame: await page.locator('#game-frame').boundingBox(), canvas: await page.locator('#game-canvas canvas').boundingBox() });
  }
  console.log(JSON.stringify({ fps, sizes }));
} finally { await browser.close(); }
