import { chromium } from '@playwright/test';
import { installVoiceHarness } from '../tests/helpers.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

// Refresh only the two bus shots after visual changes; the full chapter capture is separate.
const out = path.resolve('docs/previews');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const errors: string[] = [], missing: string[] = [], states: unknown[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
  await installVoiceHarness(page, 450);
  await page.goto(process.env.THEME_PREVIEW_URL ?? 'http://127.0.0.1:5174');
  await page.waitForFunction(() => !(document.querySelector('.start-button') as HTMLButtonElement)?.disabled);
  await page.locator('[data-action="select-level"][data-level="7"]').click();
  await page.locator('.start-button').click();
  for (const [moment, name, delay] of [
    ['community-bus-door', 'community-boarding', 3500],
    ['community-bus-ride', 'community-ride', 900],
  ] as const) {
    await page.waitForFunction(moment => {
      const frame = document.querySelector<HTMLElement>('#game-frame');
      return frame?.dataset.moment === moment && frame.dataset.turn === 'success';
    }, moment, { timeout: 180_000 });
    await page.waitForTimeout(delay);
    await page.locator('#game-frame').screenshot({ path: path.join(out, name + '.png') });
    states.push(await page.locator('#game-frame').evaluate((element, name) => ({ name, ...(element as HTMLElement).dataset }), name));
    console.log('Captured ' + name);
  }
  await fs.writeFile(path.join(out, 'community-bus-preview-checks.json'), JSON.stringify({ errors, missing, states,
    note: 'Final bus-only visual follow-up: one driver beside the boarding bus, one driver inside the moving bus. Actual Phaser rendering; voice activity simulated.' }, null, 2) + '\n');
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
} finally { await browser.close(); }
