import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [], missing = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) missing.push([response.status(), response.url()]); });
const out = 'docs/previews';
await fs.mkdir(out + '/frames', { recursive: true });
try {
  await page.goto('http://127.0.0.1:5174');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/snow-intro.png' });
  await page.getByRole('button', { name: '冒险设置', exact: true }).click();
  await page.locator('[data-mode="read"][data-action="set-mode"]').click();
  await page.getByRole('button', { name: '设置好了，继续冒险' }).click();
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await page.locator('.start-button').click();
  const capture = async name => {
    for (let i = 0; i < 24; i++) {
      await page.locator('#game-frame').screenshot({ path: out + '/frames/' + name + '-' + String(i).padStart(3, '0') + '.png' });
      await page.waitForTimeout(70);
    }
  };
  for (let index = 0; index < 14; index++) {
    await expect(page.locator('.step-number')).toHaveText((index + 1) + ' / 20');
    await expect(page.locator('#travel-overlay')).toBeHidden();
    if (index === 3) await page.locator('#game-frame').screenshot({ path: out + '/snow-orchard.png' });
    if (index === 9) await page.locator('#game-frame').screenshot({ path: out + '/snow-bridge.png' });
    if ([3, 4, 5].includes(index)) await page.locator('[data-choice="' + ['apple', 'banana', 'pear'][index - 3] + '"]').click();
    else if (index === 9) await page.locator('[data-action="jump"]').click();
    else if (index === 10) await page.locator('[data-action="right"]').click();
    else await page.locator('[data-action="read"]').click();
    if (index === 3) await capture('collect');
    if (index === 12) await capture('cast');
    await expect(page.locator('.continue-button')).toBeEnabled();
    if (index === 7) await page.locator('#game-frame').screenshot({ path: out + '/snow-gate.png' });
    await page.locator('.continue-button').click();
  }
  console.log(JSON.stringify({ errors, missing, previewFrames: 48 }));
} finally { await browser.close(); }
