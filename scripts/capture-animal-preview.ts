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
  await page.locator('[data-action="select-level"][data-level="6"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'animals-intro.png'), fullPage: true });
  await page.locator('.start-button').click();
  const shots: [string, string, number][] = [
    ['animal-cat-wake', 'animals-wake', 1300], ['animal-dog-fetch', 'animals-fetch', 1550],
    ['animal-cat-peek', 'animals-shelter', 1000], ['animal-bird-fly', 'animals-flight', 650],
    ['animal-duck-paddle', 'animals-paddle', 1400], ['animal-fish-swim', 'animals-pond', 1400],
    ['animal-fish-window', 'animals-window', 1200], ['animal-cat-groom', 'animals-groom', 1100],
    ['animal-dog-shake', 'animals-shake', 500], ['animal-rabbit-rest', 'animals-rest', 1750],
    ['animal-duck-duet', 'animals-duet', 900], ['animal-party', 'animals-camp', 800],
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
    if (moment === 'animal-party') {
      const frames = path.join(out, 'animal-frames'); await fs.mkdir(frames, { recursive: true });
      for (let i = 0; i < 16; i++) {
        await page.locator('#game-frame').screenshot({ path: path.join(frames, String(i).padStart(2, '0') + '.png') });
        await page.waitForTimeout(70);
      }
    }
  }
  await page.locator('#complete-overlay').waitFor({ state: 'visible', timeout: 15000 });
  await fs.writeFile(path.join(out, 'animal-preview-checks.json'), JSON.stringify({ errors, missing, states,
    note: 'Actual Phaser rendering; voice activity simulated. Animals report actual rendered texture/frame and water habitat.' }, null, 2) + '\n');
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
} finally { await browser.close(); }
