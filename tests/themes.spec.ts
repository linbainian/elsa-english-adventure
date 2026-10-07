import { test, expect } from '@playwright/test';
import { installVoiceHarness } from './helpers';
import { LEVELS } from '../src/game/level';
import type { WardrobeChange } from '../src/game/level';

for (const level of LEVELS.filter(level => level.theme && level.id !== 1)) {
  test('主题关卡 ' + level.id + '：全程语音穿过三幕并获得独立结局', async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [], missing: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) missing.push(response.url()); });
    await installVoiceHarness(page, 450);
    await page.goto('/');
    await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
    await page.locator('[data-action="select-level"][data-level="' + level.id + '"]').click();
    await expect(page.locator('#intro-overlay h2')).toContainText(level.intro.heading.split('<br>')[0]!);
    await page.locator('.start-button').click();

    const worlds = new Set<string>();
    const moments = new Set<string>();
    let worn: WardrobeChange = { look: 'casual', hat: false, shoes: 'plain' };
    const animalFriends = new Set<string>();
    const townFriends = new Set<string>();
    for (const [index, step] of level.steps.entries()) {
      await expect(page.locator('.step-number')).toHaveText(String(index + 1) + ' / ' + level.steps.length, { timeout: 15000 });
      await expect(page.locator('#game-frame')).toHaveAttribute('data-moment', step.moment!.type, { timeout: 15000 });
      worlds.add(await page.locator('#game-frame').getAttribute('data-world') ?? '');
      moments.add(await page.locator('#game-frame').getAttribute('data-moment') ?? '');
      await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'success', { timeout: 15000 });
      await expect(page.locator('.cue-helper')).toHaveText(step.success);
      if (level.id === 5 && step.id === 'c-coat') {
        // Pause before the delayed clothing replacement: both the flight and live texture must freeze.
        await page.getByRole('button', { name: '暂停一下', exact: true }).click();
        const before = await page.locator('#game-frame').getAttribute('data-look');
        const speechCount = await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length);
        await page.waitForTimeout(1200);
        await expect(page.locator('.step-number')).toHaveText('7 / 13');
        await expect(page.locator('#game-frame')).toHaveAttribute('data-look', before!);
        expect(await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length)).toBe(speechCount);
        await page.getByRole('button', { name: '继续冒险', exact: true }).click();
      }
      await page.waitForTimeout(450);
      if (level.id !== 5) {
        // Shared character actions must keep this location's costume rather than
        // falling back to the old blue casting/cheering frames.
        const looks: Record<number, string[]> = {
          2: ['garden', 'garden', 'starlight'], 3: ['spring', 'spring', 'spirit'],
          4: ['garden', 'winter', 'starlight'], 6: ['winter', 'spring', 'winter'],
          7: ['garden', 'spring', 'spirit'],
        };
        const look = looks[level.id]![step.act]!;
        await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-look', look);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-texture', 'elsa-' + look);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-elsa-frame-width', '1024');
        await expect(page.locator('#dialogue .elsa-portrait')).toHaveAttribute('src', '/assets/elsa-looks/' + look + '-portrait.png');
      }
      if (level.id === 5) {
        worn = { ...worn, ...step.moment!.wardrobe };
        await expect(page.locator('#game-frame')).toHaveAttribute('data-look', worn.look!, { timeout: 4000 });
        await expect(page.locator('#game-frame')).toHaveAttribute('data-actor-texture', 'theme-wardrobe/outfit-' + worn.look);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-portrait-frame', '__BASE');
        await expect(page.locator('#game-frame')).toHaveAttribute('data-portrait-frame-width', '1024');
        await expect(page.locator('#game-frame')).toHaveAttribute('data-actor-frame-width', '1024');
        await expect(page.locator('#game-frame')).toHaveAttribute('data-hat', String(worn.hat));
        await expect(page.locator('#game-frame')).toHaveAttribute('data-shoes', worn.shoes!);
      }
      if (level.id === 6) {
        const focus = step.moment!.focus;
        if (focus !== 'animals') animalFriends.add(focus);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-animal-count', String(animalFriends.size));
        await expect(page.locator('#animal-friends .met')).toHaveCount(animalFriends.size);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-fish-in-water', 'true');
        const widths = JSON.parse(await page.locator('#game-frame').getAttribute('data-animal-frame-widths') ?? '[]');
        expect(widths.length).toBe(index >= 8 ? 6 : 3);
        expect(widths.every((width: number) => width === 512)).toBeTruthy();
        if (step.world === 'animals-pond') await expect(page.locator('#game-frame')).toHaveAttribute('data-fish-habitat', 'pond');
        if (step.world === 'animals-pond') await expect(page.locator('#game-frame')).toHaveAttribute('data-animal-textures', /duck-swim/);
        if (step.world === 'animals-camp') await expect(page.locator('#game-frame')).toHaveAttribute('data-fish-habitat', 'aquarium');
        if (step.id === 'a-bird') {
          // Freeze a live flight, including nested sprites, bubbles and ambient scene effects.
          await page.getByRole('button', { name: '暂停一下', exact: true }).click();
          await page.waitForTimeout(250);
          const canvas = page.locator('#game-canvas canvas');
          const before = await canvas.screenshot();
          const speechCount = await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length);
          await page.waitForTimeout(1200);
          expect((await canvas.screenshot()).equals(before)).toBeTruthy();
          await expect(page.locator('.step-number')).toHaveText('5 / 13');
          expect(await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length)).toBe(speechCount);
          await page.getByRole('button', { name: '继续冒险', exact: true }).click();
        }
        if (step.id === 'a-rabbit-bed') await expect(page.locator('#game-frame')).toHaveAttribute('data-animal-textures', /rabbit-sleep/, { timeout: 3500 });
        if (step.id === 'a-duck-dance') await expect(page.locator('#game-frame')).toHaveAttribute('data-animal-textures', /rabbit-sleep/);
      }
      if (level.id === 4 && step.id === 't-my-train') {
        // A parent may pause during the assembled train ride; no voice or next step may leak through.
        await page.getByRole('button', { name: '暂停一下', exact: true }).click();
        await expect(page.locator('#modal')).toBeVisible();
        const pausedSpeechCount = await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length);
        await page.waitForTimeout(1200);
        await expect(page.locator('.step-number')).toHaveText('8 / 13');
        expect(await page.evaluate(() => (window as unknown as { voiceTest: { speech: unknown[] } }).voiceTest.speech.length)).toBe(pausedSpeechCount);
        await page.getByRole('button', { name: '继续冒险', exact: true }).click();
        await expect(page.locator('#modal')).not.toBeVisible();
      }
      if (level.id === 7) {
        const focus = step.moment!.focus;
        if (focus !== 'community') townFriends.add(focus);
        await expect(page.locator('#game-frame')).toHaveAttribute('data-community-count', String(townFriends.size));
        await expect(page.locator('#animal-friends .met')).toHaveCount(townFriends.size);
        const widths: number[] = JSON.parse(await page.locator('#game-frame').getAttribute('data-community-frame-widths') ?? '[]');
        expect(widths.length).toBeGreaterThanOrEqual(3);
        expect(widths.every(width => width === 512)).toBeTruthy();
        if (step.id === 'm-bus') {
          await expect(page.locator('#game-frame')).toHaveAttribute('data-bus-door-open', 'true');
          await expect(page.locator('#game-frame')).toHaveAttribute('data-bus-passenger', 'true');
        }
        if (step.id === 'm-nurse') await expect(page.locator('#game-frame')).toHaveAttribute('data-teddy-blanket', 'true');
        if (step.id === 'm-dentist') await expect(page.locator('#game-frame')).toHaveAttribute('data-tooth-clean', 'true');
        if (step.id === 'm-bus-ride') {
          await page.getByRole('button', { name: '暂停一下', exact: true }).click();
          await page.waitForTimeout(250);
          const canvas = page.locator('#game-canvas canvas');
          const before = await canvas.screenshot();
          await page.waitForTimeout(1200);
          expect((await canvas.screenshot()).equals(before)).toBeTruthy();
          await expect(page.locator('.step-number')).toHaveText(String(index + 1) + ' / ' + level.steps.length);
          await page.getByRole('button', { name: '继续冒险', exact: true }).click();
        }
      }
      const cue = await page.locator('#play-cue').boundingBox();
      const frame = await page.locator('#game-frame').boundingBox();
      expect(cue!.x).toBeGreaterThanOrEqual(frame!.x);
      expect(cue!.x + cue!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
      expect(cue!.y + cue!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
      // The child never uses a next button, keyboard or object picker during the run.
      await expect(page.locator('#star-count')).toHaveText(String(index + 1));
    }
    await expect(page.locator('#complete-overlay')).toBeVisible({ timeout: 15000 });
    expect([...worlds]).toEqual(level.acts.map(act => act.world));
    expect(moments.size).toBeGreaterThanOrEqual(10);
    await expect(page.locator('#discovery-count')).toContainText('3 / 3');
    await expect(page.locator('.spell-slot')).toHaveCount(0);
    await expect(page.locator('#game-frame')).toHaveAttribute('data-world', level.steps.at(-1)!.world);
    const trace = await page.evaluate(() => (window as unknown as { voiceTest: {
      speech: { text: string; src: string; ended: boolean; cancelled: boolean; travelling: boolean }[];
      microphoneOverlaps: number; travelOverlaps: number; synthesisCalls: number;
    } }).voiceTest);
    expect(trace.microphoneOverlaps).toBe(0);
    expect(trace.travelOverlaps).toBe(0);
    expect(trace.synthesisCalls).toBe(0);
    expect(trace.speech.every(item => /\/assets\/audio\/[^/]+\.mp3$/.test(item.src))).toBeTruthy();
    expect(trace.speech.some(item => item.travelling)).toBeFalsy();
    for (const step of level.steps) {
      expect(trace.speech.some(item => item.text === step.coach && item.ended)).toBeTruthy();
      expect(trace.speech.some(item => item.text === step.success && item.ended)).toBeTruthy();
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('little-english-adventure:progress') ?? '{}'));
    expect(saved[level.id]).toBe(level.steps.length);
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);

    await page.locator('#complete-overlay [data-action="restart"]').click();
    if (level.id === 5) {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-look', 'casual');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-hat', 'false');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-shoes', 'plain');
    }
    if (level.id === 6) {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-animal-count', '0');
      await expect(page.locator('#animal-friends .met')).toHaveCount(0);
      await page.locator('[data-action="select-level"][data-level="5"]').click();
      await expect(page.locator('#game-frame')).toHaveAttribute('data-look', 'casual');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-actor-frame-width', '1024');
      await expect(page.locator('#animal-friends')).toBeHidden();
      await expect(page.locator('#game-frame')).not.toHaveAttribute('data-animal-count');
    }
    if (level.id === 7) {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-community-count', '0');
      await expect(page.locator('#animal-friends .met')).toHaveCount(0);
    }
    await page.locator('[data-action="select-level"][data-level="1"]').click();
    await expect(page.locator('#intro-overlay')).toBeVisible();
    await expect(page.locator('#star-count')).toHaveText('0');
    await expect(page.locator('#game-frame')).toHaveAttribute('data-theme', 'welcome');
    await expect(page.locator('#game-frame')).not.toHaveAttribute('data-community-count');
    await expect(page.locator('#animal-friends')).toBeHidden();
    if (level.id === 5) {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-actor-texture', 'princess-idle');
      await expect(page.locator('#game-frame')).toHaveAttribute('data-actor-frame-width', '1024');
      await expect(page.locator('#game-frame')).not.toHaveAttribute('data-look');
    }
  });
}

for (const levelId of [2, 4, 5, 6, 7]) test('MiniMax 录制语音 · 第 ' + levelId + ' 关：暂停立即停止，恢复后完整表扬，无合成音串入', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const trace = { plays: [] as { src: string; ended: boolean; paused: boolean }[], fallback: 0 };
    (window as unknown as { recordingTest: typeof trace }).recordingTest = trace;
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      private entry?: { src: string; ended: boolean; paused: boolean };
      async play() {
        this.entry = { src: this.src, ended: false, paused: false };
        trace.plays.push(this.entry);
        const entry = this.entry;
        this.addEventListener('ended', () => { entry.ended = true; }, { once: true });
        return super.play();
      }
      pause() { if (this.entry && !this.ended) this.entry.paused = true; super.pause(); }
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true, get: () => { trace.fallback++; throw new Error('Browser speech synthesis must not be used.'); },
    });
  });
  // Use parent preview mode for this real-audio cancellation test.
  await page.goto('/');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
  await page.locator('[data-action="select-level"][data-level="' + levelId + '"]').click();
  await page.getByRole('button', { name: '冒险设置', exact: true }).click();
  await page.locator('[data-action="set-mode"][data-mode="read"]').click();
  await page.getByRole('button', { name: '设置好了，继续冒险' }).click();
  await page.locator('.start-button').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { recordingTest: { plays: unknown[] } }).recordingTest.plays.length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '暂停一下', exact: true }).click();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as unknown as { recordingTest: { plays: { paused: boolean }[] } }).recordingTest.plays.some(item => item.paused))).toBeTruthy();
  await page.getByRole('button', { name: '继续冒险', exact: true }).click();
  await expect(page.locator('[data-action="read"]')).toBeEnabled();
  await page.locator('[data-action="read"]').click();
  await expect(page.locator('.continue-button')).toBeEnabled({ timeout: 16000 });
  await page.locator('.continue-button').click();
  await expect(page.locator('.step-number')).toHaveText('2 / ' + LEVELS.find(level => level.id === levelId)!.steps.length);
  const trace = await page.evaluate(() => (window as unknown as { recordingTest: { plays: { src: string; ended: boolean }[]; fallback: number } }).recordingTest);
  expect(trace.fallback).toBe(0);
  expect(trace.plays.some(item => item.src.includes('good-') && item.ended)).toBeTruthy();
  expect(trace.plays.some(item => item.src.includes('guide-') && item.ended)).toBeTruthy();
  await page.getByRole('button', { name: '暂停一下', exact: true }).click();
  expect(errors).toEqual([]);
});
