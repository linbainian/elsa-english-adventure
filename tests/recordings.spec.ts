import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LEVELS, audioKey } from '../src/game/level';
import { setMode } from './helpers';

type RecordingTrace = {
  plays: { src: string; ended: boolean; paused: boolean; failed: boolean; durationSeconds: number }[];
  synthesisCalls: number;
};
const manifest: Record<string, { normal: string; slow?: string }> = JSON.parse(
  readFileSync('public/assets/audio/manifest.json', 'utf8'),
);
const firstKey = audioKey(LEVELS[0]!.steps[0]!.npc);
const firstFile = manifest[firstKey]!.normal;
const manifestURL = '**/assets/audio/manifest.json';

async function installRecordingProbe(page: Page, rejectPlayback = false) {
  await page.addInitScript(({ rejectPlayback }) => {
    const trace: RecordingTrace = { plays: [], synthesisCalls: 0 };
    (window as unknown as { recordingsOnly: RecordingTrace }).recordingsOnly = trace;
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      private entry?: RecordingTrace['plays'][number];
      async play() {
        const entry = { src: this.src, ended: false, paused: false, failed: false, durationSeconds: 0 };
        this.entry = entry;
        trace.plays.push(entry);
        this.addEventListener('ended', () => { entry.ended = true; entry.durationSeconds = this.duration; }, { once: true });
        this.addEventListener('error', () => { entry.failed = true; }, { once: true });
        if (rejectPlayback) { entry.failed = true; throw new DOMException('Playback blocked', 'NotAllowedError'); }
        return super.play();
      }
      pause() {
        if (this.entry && !this.ended) this.entry.paused = true;
        super.pause();
      }
    };
    for (const name of ['speechSynthesis', 'SpeechSynthesisUtterance']) {
      Object.defineProperty(window, name, {
        configurable: true, get: () => { trace.synthesisCalls++; throw new Error('Browser speech synthesis must not be used.'); },
      });
    }
  }, { rejectPlayback });
}

const readTrace = (page: Page) => page.evaluate(() => (window as unknown as { recordingsOnly: RecordingTrace }).recordingsOnly);

async function startPreview(page: Page) {
  await page.goto('/');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20000 });
  await setMode(page, 'read');
  // Isolate the existing "listen to example" flow from the new Chinese story coach.
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await page.locator('.start-button').click();
  await expect(page.locator('[data-action="example"]')).toBeEnabled();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: '开启声音', exact: true }).click();
  await page.locator('[data-action="example"]').click();
}

for (const failure of ['missing-entry', 'missing-file', 'blocked-playback'] as const) {
  test('仅录音：' + failure + ' 时保持静音，提示重试且不调用浏览器合成', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await installRecordingProbe(page, failure === 'blocked-playback');
    if (failure === 'missing-entry') {
      const incomplete = { ...manifest };
      delete incomplete[firstKey];
      await page.route(manifestURL, route => route.fulfill({ json: incomplete }));
    } else if (failure === 'missing-file') {
      await page.route('**/assets/audio/' + firstFile, route => route.fulfill({ status: 404 }));
    }
    await startPreview(page);
    await expect(page.locator('#world-toast.visible')).toContainText('再听一次');
    await expect(page.locator('#dialogue .dialogue-audio')).not.toHaveClass(/speaking/);
    await expect(page.locator('.step-number')).toHaveText('1 / 13');
    const trace = await readTrace(page);
    expect(trace.synthesisCalls).toBe(0);
    expect(trace.plays).toHaveLength(failure === 'missing-entry' ? 0 : 1);
    if (failure !== 'missing-entry') expect(trace.plays[0]!.failed).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test('仅录音：语音索引暂时加载失败，重试后正常播放 MiniMax 文件', async ({ page }) => {
  await installRecordingProbe(page);
  let requests = 0;
  await page.route(manifestURL, route => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: manifest });
  });
  await startPreview(page);
  await expect(page.locator('#world-toast.visible')).toContainText('再听一次');
  await page.locator('[data-action="example"]').click();
  await expect.poll(async () => (await readTrace(page)).plays.some(clip => clip.ended), { timeout: 10000 }).toBeTruthy();
  const trace = await readTrace(page);
  expect(requests).toBe(2);
  expect(trace.synthesisCalls).toBe(0);
  expect(trace.plays).toHaveLength(1);
  expect(trace.plays[0]!.src).toContain('/assets/audio/' + firstFile);
  expect(trace.plays[0]!.failed || trace.plays[0]!.paused).toBeFalsy();
});

test('仅录音：等待索引时暂停，加载完成后不播放过期台词', async ({ page }) => {
  await installRecordingProbe(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const pending = new Promise<void>(resolve => { requested = resolve; });
  await page.route(manifestURL, async route => {
    requested();
    await held;
    await route.fulfill({ json: manifest });
  });
  try {
    await startPreview(page);
    await pending;
    await page.getByRole('button', { name: '暂停一下', exact: true }).click();
    release();
    await expect(page.locator('#modal')).toBeVisible();
    await page.waitForTimeout(600);
    expect((await readTrace(page)).plays).toHaveLength(0);
    await expect(page.locator('.step-number')).toHaveText('1 / 13');
    await page.getByRole('button', { name: '继续冒险', exact: true }).click();
    await page.locator('[data-action="example"]').click();
    await expect.poll(async () => (await readTrace(page)).plays.some(clip => clip.ended), { timeout: 10000 }).toBeTruthy();
    const trace = await readTrace(page);
    expect(trace.plays).toHaveLength(1);
    expect(trace.synthesisCalls).toBe(0);
  } finally { release(); }
});

test('仅录音：按实际音频时长等待，较长 MiniMax 台词完整结束', async ({ page }) => {
  await installRecordingProbe(page);
  // Put a real 9-second recording behind the short greeting to expose text-length timeouts.
  const archived = JSON.parse(readFileSync('public/assets/audio/voice-report.json', 'utf8')) as { file: string; durationMs?: number }[];
  const longFile = archived.find(clip => (clip.durationMs ?? 0) > 9000)!.file;
  await page.route(manifestURL, route => route.fulfill({ json: { ...manifest, [firstKey]: { normal: longFile } } }));
  await startPreview(page);
  await expect.poll(async () => (await readTrace(page)).plays.some(clip => clip.ended), { timeout: 16000 }).toBeTruthy();
  const trace = await readTrace(page);
  expect(trace.synthesisCalls).toBe(0);
  expect(trace.plays).toHaveLength(1);
  expect(trace.plays[0]!.src).toContain('/assets/audio/' + longFile);
  expect(trace.plays[0]!.durationSeconds).toBeGreaterThan(8);
  expect(trace.plays[0]!.paused || trace.plays[0]!.failed).toBeFalsy();
  await expect(page.locator('#dialogue .dialogue-audio')).not.toHaveClass(/speaking/);
});
