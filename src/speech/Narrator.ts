import { audioKey } from '../game/level';

type AudioEntry = { normal: string; slow?: string };
type VoiceManifest = Record<string, AudioEntry>;

let manifestPromise: Promise<VoiceManifest | null> | null = null;

function loadManifest(): Promise<VoiceManifest | null> {
  manifestPromise ??= fetch('assets/audio/manifest.json')
    .then(response => response.ok ? response.json() as Promise<VoiceManifest> : null)
    .catch(() => null)
    .then(manifest => {
      // A transient load failure must be retryable when the parent replays the prompt.
      if (!manifest) manifestPromise = null;
      return manifest;
    });
  return manifestPromise;
}

export class Narrator {
  enabled = true;
  private finish: (() => void) | null = null;
  private current: HTMLAudioElement | null = null;
  private generation = 0;

  stop() {
    this.generation += 1;
    const audio = this.current;
    this.current = null;
    const finish = this.finish;
    this.finish = null;
    if (finish) finish(); else audio?.pause();
  }

  async say(text: string, slow = false): Promise<boolean> {
    this.stop();
    if (!this.enabled) return false;
    const generation = this.generation;
    const spoken = await this.sayFromRecording(text, slow, generation);
    if (generation !== this.generation || !this.enabled) return false;
    return spoken;
  }

  /** All spoken lines use generated MiniMax recordings. A missing/failed clip stays silent. */
  private async sayFromRecording(text: string, slow: boolean, generation: number): Promise<boolean> {
    const manifest = await loadManifest();
    if (generation !== this.generation || !this.enabled) return false;
    const entry = manifest?.[audioKey(text)];
    const file = entry && (slow ? entry.slow ?? entry.normal : entry.normal);
    if (!file) return false;
    return new Promise(resolve => {
      const audio = new Audio(`assets/audio/${file}`);
      this.current = audio;
      let settled = false;
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const done = (success: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        audio.onended = audio.onerror = audio.onloadedmetadata = audio.onplaying = null;
        if (!success) audio.pause();
        if (this.finish === cancelled) this.finish = null;
        if (this.current === audio) this.current = null;
        resolve(success);
      };
      const cancelled = () => done(false);
      this.finish = cancelled;
      audio.onended = () => done(true);
      audio.onerror = () => done(false);
      const armWatchdog = () => {
        clearTimeout(watchdog);
        if (settled) return;
        // Actual recording duration controls playback; text length can underestimate slow speech.
        const timeout = Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(3000, (audio.duration - audio.currentTime + 3) * 1000)
          : Math.max(12000, Math.min(60000, text.length * 400));
        watchdog = setTimeout(() => done(false), timeout);
      };
      audio.onloadedmetadata = audio.onplaying = armWatchdog;
      armWatchdog();
      try { void audio.play().catch(() => done(false)); }
      catch { done(false); }
    });
  }
}
