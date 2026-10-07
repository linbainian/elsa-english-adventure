/** Offline, resumable MiniMax speech generation. Credentials stay in .env or process.env. */
import { writeFileSync, mkdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LEVELS, audioKey } from '../src/game/level.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/assets/audio');
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const dryRun = argv.includes('--dry-run');
const option = (name: string) => argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const levelIds = option('--levels')?.split(',').map(Number);
const limit = Number(option('--limit') ?? Infinity);
const env: Record<string, string> = {};
try {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]!] = match[2]!.replace(/^['"]|['"]$/g, '');
  }
} catch { /* process environment also supported */ }
const setting = (key: string, fallback = '') => process.env[key] ?? env[key] ?? fallback;
const apiKey = setting('MINIMAX_API_KEY');
const voice = setting('MINIMAX_VOICE', 'female-shaonv');
const model = setting('MINIMAX_MODEL', 'speech-02-hd');
const groupId = setting('MINIMAX_GROUP_ID');
const host = new URL(setting('MINIMAX_ENDPOINT', 'https://api.minimaxi.com/v1/t2a_v2'));
if (host.protocol !== 'https:' || !['api.minimaxi.com', 'api.minimax.io', 'api.minimax.chat'].includes(host.hostname)) throw new Error('MiniMax endpoint must use the official HTTPS API.');
if (groupId) host.searchParams.set('GroupId', groupId);
if (!apiKey && !dryRun) { console.error('缺少 MINIMAX_API_KEY，请在本地 .env 中配置。'); process.exit(1); }

const extras = ['Hello, little adventurer!', 'You brought the magic back!', 'Your turn!', "Let's try together!", 'Good!', 'Great job!', 'Well done!', 'You did it!', 'Nice jump!', 'Amazing!', 'Cool!'];
const lines = new Map<string, { text: string; slow: boolean }>();
const add = (text: string, slow = false) => {
  const key = audioKey(text) + '|' + (slow ? 's' : 'n');
  if (!lines.has(key)) lines.set(key, { text, slow });
};
for (const level of LEVELS.filter(level => !levelIds || levelIds.includes(level.id))) for (const step of level.steps) {
  add(step.npc);
  if (step.coach) add(step.coach);
  if (step.moment) add(step.success);
  if (step.target) { add(step.target); add(step.target, true); }
  if (step.praise) add(step.praise);
}
extras.forEach(text => add(text));
const hash = (text: string) => { let value = 5381; for (const char of text) value = (value * 33 ^ char.codePointAt(0)!) >>> 0; return value.toString(36); };
const filename = (text: string, slow: boolean) => (audioKey(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || 'guide') + '-' + hash(audioKey(text)) + (slow ? '-slow' : '') + '.mp3';
type Entry = { normal: string; slow?: string };
type GeneratedInfo = { file: string; text: string; language: string; durationMs?: number; bytes: number; voice: string; model: string };
mkdirSync(outDir, { recursive: true });
const manifestPath = path.join(outDir, 'manifest.json');
const reportPath = path.join(outDir, 'voice-report.json');
const manifest: Record<string, Entry> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const report: GeneratedInfo[] = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : [];
const missing = [...lines.values()].filter(line => force || !existsSync(path.join(outDir, filename(line.text, line.slow))) || statSync(path.join(outDir, filename(line.text, line.slow))).size <= 1000);
console.log('语音清单：' + lines.size + '，需生成 ' + missing.length + '，复用 ' + (lines.size - missing.length) + '，新增文本字符 ' + missing.reduce((sum, line) => sum + line.text.length, 0));
if (dryRun) process.exit(0);

async function synthesize(text: string, slow: boolean) {
  const language = /[\u3400-\u9fff]/.test(text) ? 'Chinese' : 'English';
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(host, {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model, text, stream: false, output_format: 'hex', language_boost: language,
        voice_setting: { voice_id: voice, speed: slow ? .72 : language === 'Chinese' ? .98 : .95, vol: 1, pitch: 3 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 } }),
    });
    const json = await response.json() as { data?: { audio?: string }; extra_info?: { audio_length?: number }; base_resp?: { status_code?: number; status_msg?: string } };
    const status = json.base_resp?.status_code ?? -1;
    if (response.ok && status === 0 && json.data?.audio && /^[a-f0-9]+$/i.test(json.data.audio)) {
      const audio = Buffer.from(json.data.audio, 'hex');
      if (audio.length <= 1000) throw new Error('MiniMax returned an empty audio clip.');
      return { audio, durationMs: json.extra_info?.audio_length, language };
    }
    if (status === 1002 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 8000 * (attempt + 1))); continue; }
    // Auth or balance errors are not repeated and never print response payloads or credentials.
    throw new Error('MiniMax status ' + status + ' / HTTP ' + response.status + ': ' + (json.base_resp?.status_msg ?? 'request failed').replaceAll(apiKey, '[redacted]'));
  }
  throw new Error('MiniMax rate limit did not recover.');
}

let generated = 0, skipped = 0;
for (const { text, slow } of lines.values()) {
  const file = filename(text, slow);
  const filePath = path.join(outDir, file);
  if (!force && existsSync(filePath) && statSync(filePath).size > 1000) skipped++;
  else {
    if (generated >= limit) break;
    const result = await synthesize(text, slow);
    writeFileSync(filePath, result.audio);
    report.push({ file, text, language: result.language, durationMs: result.durationMs, bytes: result.audio.length, voice, model });
    generated++;
    console.log('生成 ' + file + ' (' + Math.round(result.audio.length / 1024) + ' KB)');
    await new Promise(resolve => setTimeout(resolve, 1600));
  }
  const key = audioKey(text);
  manifest[key] ??= { normal: '' };
  if (slow) manifest[key]!.slow = file; else manifest[key]!.normal = file;
  // Persist after every clip so an interruption does not waste completed requests.
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
}
console.log('完成：新生成 ' + generated + ' 个，复用 ' + skipped + ' 个。');
