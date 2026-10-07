import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LEVELS, audioKey } from '../src/game/level.ts';
import { feedbackFor } from '../src/game/feedback.ts';

const recordingTexts: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync('public/assets/audio/voice-report.json', 'utf8')) as { file: string; text: string }[])
    .map(clip => [clip.file, clip.text]),
);
// Older recordings predate voice-report.json; resolve their spoken lines from the catalog.
const voiceManifest: Record<string, { normal: string; slow?: string }> = JSON.parse(
  readFileSync('public/assets/audio/manifest.json', 'utf8'),
);
for (const level of LEVELS) for (const step of level.steps) {
  for (const text of [step.npc, step.coach, step.target, step.moment ? step.success : undefined, feedbackFor(step).praise]) {
    if (!text) continue;
    const entry = voiceManifest[audioKey(text)];
    if (!entry) throw new Error('Missing recorded voice: ' + text);
    recordingTexts[entry.normal] ??= text;
    if (entry.slow) recordingTexts[entry.slow] ??= text;
  }
}
for (const text of ['Hello, little adventurer!', 'You brought the magic back!', "Let's try together!"]) {
  const entry = voiceManifest[audioKey(text)];
  if (!entry) throw new Error('Missing recorded guide: ' + text);
  recordingTexts[entry.normal] ??= text;
}

export async function setMode(page: Page, mode: 'voice' | 'read' | 'type') {
  await page.getByRole('button', { name: '冒险设置', exact: true }).click();
  await page.locator(`[data-action="set-mode"][data-mode="${mode}"]`).click();
  await page.getByRole('button', { name: '设置好了，继续冒险' }).click();
}

export async function installVoiceHarness(page: Page, praiseMs = 450) {
  await page.addInitScript(({ praiseMs, recordingTexts }) => {
    const trace = { speech: [] as { text: string; src: string; ended: boolean; cancelled: boolean; travelling: boolean; tone: string | undefined }[], active: false, microphoneOverlaps: 0, travelOverlaps: 0, synthesisCalls: 0 };
    (window as unknown as { voiceTest: typeof trace }).voiceTest = trace;
    const NativeAudio = window.Audio;
    const praises = ['Good!', 'Great job!', 'Well done!', 'You did it!', 'Nice jump!', 'Amazing!', 'Cool!'];
    // Simulate completion of recorded MP3 playback, with no test branch in production code.
    window.Audio = class extends NativeAudio {
      private timer?: ReturnType<typeof setTimeout>;
      private entry?: (typeof trace.speech)[number];
      private playbackMs = 250;
      get duration() { return this.playbackMs / 1000; }
      async play() {
        const file = new URL(this.src).pathname.split('/').at(-1)!;
        const text = recordingTexts[file];
        if (!text) throw new Error('Unknown recorded voice: ' + file);
        const entry = { text, src: this.src, ended: false, cancelled: false, travelling: document.querySelector<HTMLElement>('#game-frame')?.dataset.travel === 'true', tone: document.querySelector<HTMLElement>('#play-cue')?.dataset.tone };
        this.entry = entry;
        this.playbackMs = praises.includes(text) ? praiseMs : 250;
        trace.speech.push(entry);
        trace.active = true;
        this.timer = setTimeout(() => {
          entry.ended = true;
          trace.active = false;
          this.dispatchEvent(new Event('ended'));
        }, this.playbackMs);
      }
      pause() {
        clearTimeout(this.timer);
        if (this.entry && !this.entry.ended) { this.entry.cancelled = true; trace.active = false; }
        super.pause();
      }
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true, get: () => { trace.synthesisCalls++; throw new Error('Browser speech synthesis must not be used.'); },
    });
    const realAudioContext = window.AudioContext;
    const audio = new realAudioContext();
    const destination = audio.createMediaStreamDestination();
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      if (trace.active) trace.microphoneOverlaps += 1;
      if (document.querySelector<HTMLElement>('#game-frame')?.dataset.travel === 'true') trace.travelOverlaps += 1;
      if (audio.state === 'suspended') await audio.resume();
      return destination.stream.clone();
    } });
    const original = realAudioContext.prototype.createAnalyser;
    realAudioContext.prototype.createAnalyser = function () {
      const analyser = original.call(this);
      const start = performance.now();
      analyser.getFloatTimeDomainData = (array: Float32Array) => {
        const time = performance.now() - start;
        const active = time > 400 && time < 1100;
        for (let i = 0; i < array.length; i++) array[i] = active ? Math.sin(i * .15) * .17 : 0;
      };
      return analyser;
    };
  }, { praiseMs, recordingTexts });
}
