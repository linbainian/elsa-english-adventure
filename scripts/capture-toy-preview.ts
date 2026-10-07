import { chromium } from '@playwright/test';
import { installVoiceHarness } from '../tests/helpers.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('docs/previews');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const errors: string[] = [], missing: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
  await installVoiceHarness(page, 450);
  await page.goto(process.env.THEME_PREVIEW_URL ?? 'http://127.0.0.1:5173');
  await page.waitForFunction(() => !(document.querySelector('.start-button') as HTMLButtonElement)?.disabled);
  await page.locator('[data-action="select-level"][data-level="4"]').click();
  await page.screenshot({ path: path.join(out, 'toys-intro.png'), fullPage: true });
  await page.locator('.start-button').click();
  const shots: [string, string, number][] = [
    ['toy-teddy-hug', 'toys-hug', 1400],
    ['toy-ball-roll', 'toys-room', 1200],
    ['toy-blocks-build', 'toys-bridge', 1700],
    ['toy-train-ride', 'toys-station', 1000],
    ['toy-car-carry', 'toys-car-ride', 1300],
    ['toy-parade', 'toys-parade', 800],
  ];
  for (const [moment, name, delay] of shots) {
    await page.waitForFunction(moment => {
      const frame = document.querySelector<HTMLElement>('#game-frame');
      return frame?.dataset.moment === moment && frame.dataset.turn === 'success';
    }, moment, { timeout: 180000 });
    await page.waitForTimeout(delay);
    await page.locator('#game-frame').screenshot({ path: path.join(out, name + '.png') });
    console.log('Captured ' + name);
    if (moment === 'toy-parade') {
      const frames = path.join(out, 'toy-frames');
      await fs.mkdir(frames, { recursive: true });
      for (let index = 0; index < 16; index++) {
        await page.locator('#game-frame').screenshot({ path: path.join(frames, String(index).padStart(2, '0') + '.png') });
        await page.waitForTimeout(70);
      }
    }
  }
  await page.locator('#complete-overlay').waitFor({ state: 'visible', timeout: 15000 });
  await fs.writeFile(path.join(out, 'toy-preview-checks.json'), JSON.stringify({ errors, missing,
    note: 'Actual Phaser rendering and voice layout; child speech simulated with the shared test harness.' }, null, 2));
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
} finally { await browser.close(); }
