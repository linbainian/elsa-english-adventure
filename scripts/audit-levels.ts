import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { LEVELS, UNITS, audioKey } from '../src/game/level.ts';
import { feedbackFor } from '../src/game/feedback.ts';
import type { Step } from '../src/game/level';

const manifest: Record<string, { normal: string; slow?: string }> = JSON.parse(readFileSync('public/assets/audio/manifest.json', 'utf8'));
const decoded: { file: string; durationSeconds: number }[] = JSON.parse(readFileSync('docs/voice-asset-checks.json', 'utf8')).results;
const durations = new Map(decoded.map(clip => [clip.file, clip.durationSeconds]));
const errors: string[] = [];
function recording(text: string | undefined, slow = false) {
  if (!text) return 0;
  const entry = manifest[audioKey(text)];
  const file = slow ? entry?.slow : entry?.normal;
  if (!file || !existsSync('public/assets/audio/' + file) || !durations.has(file)) {
    errors.push('Missing or unvalidated recording: ' + text + (slow ? ' [slow]' : ''));
    return 0;
  }
  return durations.get(file)!;
}
function reaction(step: Step, theme: string) {
  const type = step.moment?.type;
  if (theme === 'welcome') return type === 'welcome-goodbye' ? 3.9 : 3.2;
  if (theme === 'community') return type === 'community-bus-door' ? 4.2 : type === 'community-bus-ride' ? 4 : type === 'community-thank-you' ? 4.6 : 3.5;
  if (theme === 'animals') return type === 'animal-party' ? 4.2 : type === 'animal-fish-window' ? 3.4 : 2.9;
  if (theme === 'clothes') return type === 'wardrobe-dance' ? 4.3 : type === 'wardrobe-footsteps' ? 3.6 : 2.8;
  if (theme === 'toys') return type === 'toy-parade' ? 4.2 : type === 'toy-train-ride' ? 3.4 : 2.8;
  return type === 'family-photo' || type === 'family-love' || type === 'body-dance' ? 3.2 : 2.4;
}
const allStepIds = new Set<string>();
const levels = LEVELS.map(level => {
  const worldSet = new Set(level.acts.map(act => act.world));
  if (level.units.length !== 1) errors.push('More than one learning theme: ' + level.id);
  if (level.spells) errors.push('Unrelated spells active in themed preschool level: ' + level.id);
  const turns = level.steps.map(step => {
    if (allStepIds.has(step.id)) errors.push('Duplicate step ID: ' + step.id);
    allStepIds.add(step.id);
    if (level.acts[step.act]?.world !== step.world || !worldSet.has(step.world)) errors.push('Invalid act/world: ' + step.id);
    if (step.kind !== 'say' || !step.coach || !step.target || !step.moment || !step.praise) errors.push('Incomplete voice guidance: ' + step.id);
    const coach = recording(step.coach), model = recording(step.npc, step.npc === step.target), target = recording(step.target, true);
    recording(step.target); recording(step.npc);
    const praise = recording(feedbackFor(step).praise), result = recording(step.success);
    const spokenPrompt = coach + model + (step.npc !== step.target ? target : 0);
    const animation = reaction(step, level.theme ?? '');
    // Praise starts with the action; result narration waits for that action, then the next turn.
    const response = Math.max((step.holdMs ?? 0) / 1000, Math.max(animation, praise) + result);
    return { id: step.id, target: step.target, moment: step.moment?.type, focus: step.moment?.focus,
      coachSeconds: Number(coach.toFixed(2)), promptSeconds: Number(spokenPrompt.toFixed(2)), responseSeconds: Number(response.toFixed(2)),
      targetWords: step.target?.match(/[a-z]+(?:'[a-z]+)?/gi)?.length ?? 0,
      fixedSeconds: spokenPrompt + .65 + .45 + response };
  });
  if (new Set(level.starStepIds).size !== 3 || level.starStepIds.some(id => !level.steps.some(step => step.id === id))) errors.push('Unreachable three-star ending: ' + level.id);
  const fixed = turns.reduce((sum, turn) => sum + turn.fixedSeconds, 0) + level.acts.length * 1.2;
  const repetition = [...new Set(turns.map(turn => turn.target))].map(target => ({ target,
    outcomes: turns.filter(turn => turn.target === target).map(turn => turn.moment) }));
  return { id: level.id, title: level.title, theme: level.theme, reference: level.units.map(ref => UNITS[ref].bigFun + ' · ' + UNITS[ref].unit),
    steps: turns.length, distinctOutcomes: new Set(turns.map(turn => turn.moment)).size, worlds: [...worldSet],
    longestCoachSeconds: Math.max(...turns.map(turn => turn.coachSeconds)), maxTargetWords: Math.max(...turns.map(turn => turn.targetWords)),
    estimateSeconds: { childResponse4Seconds: Math.round(fixed + turns.length * 4), childResponse8Seconds: Math.round(fixed + turns.length * 8) },
    repetition, turns };
});
const report = { date: '2026-10-04', errors: [...new Set(errors)], levels,
  assumptions: 'Measured local MP3 durations; authored response/hold times; 0.65s microphone handoff, 0.45s automatic continuation, 1.2s per act transition. Child response scenarios of 4s and 8s include speaking/settling. No retries, pauses or real child measurements. Reaction estimates mirror current director timing and should be rechecked after animation edits.',
  assessment: 'Counts check structural coherence, never a numerical fun or learning score. Pedagogical and visual review is in docs/level-review.md.' };
writeFileSync('docs/level-audit.json', JSON.stringify(report, null, 2) + '\n');
for (const level of levels) console.log('Level ' + level.id + ': ' + level.steps + ' turns, ' + level.distinctOutcomes + ' outcomes; estimated ' + level.estimateSeconds.childResponse4Seconds + '-' + level.estimateSeconds.childResponse8Seconds + ' seconds; longest coach ' + level.longestCoachSeconds + 's');
if (report.errors.length) { console.error(report.errors); process.exitCode = 1; }
else console.log('All seven levels structurally coherent; normal/slow MiniMax recordings validated.');
