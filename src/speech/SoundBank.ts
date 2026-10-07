/** Small original synthesized effects: no remote audio files or background playback. */
export class SoundBank {
  enabled = true;
  private context: AudioContext | null = null;

  unlock() {
    if (!window.AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  chime(big = false) {
    this.notes(big ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880]);
  }

  travel() { this.notes([783.99, 1046.5, 1318.51], .021, .16); }
  ready() { this.notes([880, 1174.66], .016, .09); }
  story(type: string) {
    const notes: Record<string, number[]> = { bell: [1046.5, 1567.98], clap: [392, 523.25], pop: [659.25, 1046.5], camera: [523.25, 783.99, 1046.5],
      bounce: [392, 659.25], build: [523.25, 880], engine: [261.63, 329.63, 392], whistle: [880, 1174.66, 880], parade: [523.25, 659.25, 783.99, 1046.5],
      dress: [659.25, 987.77, 1318.51], step: [392, 523.25],
      bird: [1318.51, 1567.98, 1318.51], pond: [523.25, 783.99], purr: [329.63, 392, 523.25] };
    this.notes(notes[type] ?? [880], .016, .07);
  }
  magic(effect: string) {
    this.notes(effect === 'fire' ? [392, 523.25, 659.25] : effect === 'ice' ? [1046.5, 1318.51, 1567.98] : [659.25, 880, 1046.5], .028);
  }

  private notes(notes: number[], volume = .035, spacing = .12) {
    if (!this.enabled) return;
    this.unlock();
    const context = this.context;
    if (!context) return;
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const time = context.currentTime + i * spacing;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + .55);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  dispose() { void this.context?.close().catch(() => undefined); this.context = null; }
}
