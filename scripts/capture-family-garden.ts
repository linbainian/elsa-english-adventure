import { chromium } from '@playwright/test';
import { installVoiceHarness } from '../tests/helpers.ts';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installVoiceHarness(page, 450);
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => !(document.querySelector('.start-button') as HTMLButtonElement)?.disabled);
  await page.locator('[data-action="select-level"][data-level="3"]').click();
  await page.locator('.start-button').click();
  await page.waitForFunction(() => {
    const frame = document.querySelector<HTMLElement>('#game-frame');
    return frame?.dataset.moment === 'family-story' && frame.dataset.turn === 'success';
  }, undefined, { timeout: 70000 });
  await page.waitForTimeout(850);
  await page.locator('#game-frame').screenshot({ path: 'docs/previews/family-garden.png' });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Checked storybook reveal and updated garden preview.');
} finally { await browser.close(); }
