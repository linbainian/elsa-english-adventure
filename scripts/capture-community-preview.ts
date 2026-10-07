import { chromium } from '@playwright/test';
import { installVoiceHarness } from '../tests/helpers.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  await page.goto(process.env.THEME_PREVIEW_URL ?? 'http://127.0.0.1:5173');
  await page.waitForFunction(() => !(document.querySelector('.start-button') as HTMLButtonElement)?.disabled);
  await page.locator('[data-action="select-level"][data-level="7"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'community-intro.png'), fullPage: true });
  await page.locator('.start-button').click();
  const shots: [string, string, number][] = [
    ['community-hello', 'community-hello', 900],
    ['community-bus-door', 'community-boarding', 3300], ['community-pinwheel', 'community-street', 1300],
    ['community-duck-crossing', 'community-crossing', 1450], ['community-ticket', 'community-ticket', 1750], ['community-bus-ride', 'community-ride', 900],
    ['community-heartbeat', 'community-heartbeat', 1650], ['community-blanket', 'community-clinic', 1700], ['community-care-thanks', 'community-thanks-nurse', 1300],
    ['community-tooth-brush', 'community-brush', 1500], ['community-doctor-introduce', 'community-doctor', 900],
    ['community-nurse-lantern', 'community-lantern', 1600], ['community-smile-bubbles', 'community-bubbles', 1400],
    ['community-star-path', 'community-path', 1300], ['community-flower-water', 'community-flower', 2300],
    ['community-thank-you', 'community-plaza', 800],
  ];
  for (const [moment, name, delay] of shots) {
    await page.waitForFunction(moment => {
      const frame = document.querySelector<HTMLElement>('#game-frame');
      return frame?.dataset.moment === moment && frame.dataset.turn === 'success';
    }, moment, { timeout: 180000 });
    await page.waitForTimeout(delay);
    await page.locator('#game-frame').screenshot({ path: path.join(out, name + '.png') });
    states.push(await page.locator('#game-frame').evaluate((element, name) => ({ name, ...(element as HTMLElement).dataset }), name));
    console.log('Captured ' + name);
    if (moment === 'community-thank-you') {
      const frames = path.join(out, 'community-frames'); await fs.mkdir(frames, { recursive: true });
      for (let i = 0; i < 16; i++) {
        await page.locator('#game-frame').screenshot({ path: path.join(frames, String(i).padStart(2, '0') + '.png') });
        await page.waitForTimeout(65);
      }
    }
  }
  await page.locator('#complete-overlay').waitFor({ state: 'visible', timeout: 15000 });
  await fs.writeFile(path.join(out, 'community-preview-checks.json'), JSON.stringify({ errors, missing, states,
    note: 'Actual Phaser game rendering, with local voice activity simulated for the sixteen story actions.' }, null, 2) + '\n');
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
  await page.locator('#complete-overlay [data-action="restart"]').click();
  await page.locator('[data-action="select-level"][data-level="1"]').click();
  await page.locator('.start-button').click();
  for (const [moment, name, delay] of [
    ['welcome-gift', 'welcome-glade', 1700], ['welcome-door', 'welcome-palace', 1600], ['welcome-goodbye', 'welcome-party', 1850],
  ] as const) {
    await page.waitForFunction(moment => {
      const frame = document.querySelector<HTMLElement>('#game-frame');
      return frame?.dataset.moment === moment && frame.dataset.turn === 'success';
    }, moment, { timeout: 180000 });
    await page.waitForTimeout(delay);
    await page.locator('#game-frame').screenshot({ path: path.join(out, name + '.png') });
    console.log('Captured ' + name);
  }
} finally { await browser.close(); }
