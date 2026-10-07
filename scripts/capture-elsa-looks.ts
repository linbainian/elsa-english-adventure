import { chromium, expect } from '@playwright/test';
import { installVoiceHarness } from '../tests/helpers.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('docs/previews/elsa');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const errors: string[] = [], missing: string[] = [], states: unknown[] = [];
try {
  for (const [level, look] of [[2, 'garden'], [3, 'spring'], [6, 'winter'], [1, 'ice']] as const) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) missing.push(response.url()); });
    await installVoiceHarness(page, 450);
    await page.goto('http://127.0.0.1:5174');
    await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
    if (level !== 1) await page.locator(`[data-action="select-level"][data-level="${level}"]`).click();
    await page.locator('.start-button').click();
    const shots = level === 1 ? ['ice', 'spirit', 'starlight'] : [look];
    for (const id of shots) {
      await page.waitForFunction(id => {
        const frame = document.querySelector<HTMLElement>('#game-frame');
        return frame?.dataset.elsaLook === id && frame.dataset.turn === 'success';
      }, id, { timeout: 160000 });
      await page.waitForTimeout(600);
      await page.locator('#game-frame').screenshot({ path: path.join(out, id + '.png') });
      await page.screenshot({ path: path.join(out, id + '-page.png'), fullPage: true });
      states.push(await page.locator('#game-frame').evaluate((node, id) => ({ id, ...(node as HTMLElement).dataset }), id));
      console.log('Captured real gameplay: ' + id);
    }
    await page.close();
  }
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({ errors, missing, states,
    note: 'Real Phaser rendering in the production build. Only child sound activity and recorded audio end events are simulated.' }, null, 2));
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
} finally { await browser.close(); }
