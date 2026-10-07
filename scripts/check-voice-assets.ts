import { chromium } from '@playwright/test';
import { LEVELS, audioKey } from '../src/game/level.ts';
import { feedbackFor } from '../src/game/feedback.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await fs.readFile('public/assets/audio/manifest.json', 'utf8'));
const needed = new Set<string>();
const requireRecording = (text: string | undefined, slow = false) => {
  if (!text) return;
  const entry = manifest[audioKey(text)];
  if (!entry?.normal) throw new Error('Missing audio: ' + text);
  needed.add(entry.normal);
  if (slow) {
    if (!entry.slow) throw new Error('Missing slow audio: ' + text);
    needed.add(entry.slow);
  }
};
for (const level of LEVELS) for (const step of level.steps) {
  requireRecording(step.coach);
  requireRecording(step.npc);
  requireRecording(step.target, true);
  requireRecording(feedbackFor(step).praise);
  if (step.moment) requireRecording(step.success);
}
// Include shared guide lines and every existing catalog entry, including the first adventure.
for (const text of ['Hello, little adventurer!', 'You brought the magic back!', "Let's try together!"])
  requireRecording(text);
for (const entry of Object.values(manifest) as { normal: string; slow?: string }[]) {
  if (entry.normal) needed.add(entry.normal);
  if (entry.slow) needed.add(entry.slow);
}
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage();
  await page.goto(process.env.THEME_PREVIEW_URL ?? 'http://127.0.0.1:5173');
  const clips = await page.evaluate(async files => {
    const context = new AudioContext();
    const result = [];
    try {
      for (const file of files) {
        const response = await fetch('/assets/audio/' + file);
        if (!response.ok) throw new Error('Missing clip ' + file);
        const decoded = await context.decodeAudioData(await response.arrayBuffer());
        let peak = 0;
        for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
          const samples = decoded.getChannelData(channel);
          for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]!));
        }
        if (decoded.duration < .3 || peak < .005) throw new Error('Empty or silent clip ' + file);
        result.push({ file, durationSeconds: Number(decoded.duration.toFixed(3)), peak: Number(peak.toFixed(4)), channels: decoded.numberOfChannels });
      }
      return result;
    } finally { await context.close(); }
  }, [...needed]);
  await fs.writeFile(path.resolve('docs/voice-asset-checks.json'), JSON.stringify({ clips: clips.length, missing: [], decodeErrors: [], results: clips }, null, 2) + '\n');
  console.log('Decoded ' + clips.length + ' MiniMax clips across all levels; all non-empty and audible.');
} finally { await browser.close(); }
