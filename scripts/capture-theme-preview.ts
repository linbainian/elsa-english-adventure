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
  for (const level of [2, 3]) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
    await installVoiceHarness(page, 450);
    await page.goto(process.env.THEME_PREVIEW_URL ?? 'http://127.0.0.1:5174');
    await page.locator('.start-button').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !(document.querySelector('.start-button') as HTMLButtonElement)?.disabled);
    await page.locator('[data-action="select-level"][data-level="' + level + '"]').click();
    await page.locator('.start-button').click();
    const shots = level === 2 ? [
      ['nose-wiggle', 'body-workshop', 850],
      ['clap-lights', 'body-music', 800],
      ['eyes-lights', 'body-stage', 900],
    ] : [
      ['family-gift', 'family-living', 850],
      ['family-story', 'family-garden', 850],
      ['family-photo', 'family-studio', 1500],
    ];
    for (const [moment, name, delay] of shots) {
      await page.waitForFunction(moment => {
        const frame = document.querySelector<HTMLElement>('#game-frame');
        return frame?.dataset.moment === moment && frame.dataset.turn === 'success';
      }, moment, { timeout: 160000 });
      await page.waitForTimeout(Number(delay));
      await page.locator('#game-frame').screenshot({ path: path.join(out, name + '.png') });
      console.log('Captured ' + name);
    }
    // A brief gameplay animation sample uses the same voice flow as the child.
    if (level === 3) {
      const frames = path.join(out, 'family-frames');
      await fs.mkdir(frames, { recursive: true });
      await page.waitForFunction(() => document.querySelector<HTMLElement>('#game-frame')?.dataset.moment === 'family-love', { timeout: 18000 });
      await page.waitForFunction(() => document.querySelector<HTMLElement>('#game-frame')?.dataset.turn === 'success');
      for (let index = 0; index < 16; index++) {
        await page.locator('#game-frame').screenshot({ path: path.join(frames, String(index).padStart(2, '0') + '.png') });
        await page.waitForTimeout(70);
      }
    }
    await page.close();
  }
  await fs.writeFile(path.join(out, 'theme-preview-checks.json'), JSON.stringify({ errors, missing, note: 'Rendered gameplay with simulated child speech; screenshots show the default voice layout.' }, null, 2));
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
} finally { await browser.close(); }
