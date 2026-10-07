export type VoiceResult = 'heard' | 'silent' | 'cancelled';

const IDLE_RELEASE_MS = 30_000;

/** Local sound activity only. No transcript, pronunciation score, or network request.
 *  The mic stream and AudioContext stay warm between turns so the handoff to the child is instant;
 *  they are released after 30s idle, and immediately on pause / hide / stop. */
export class VoiceInput {
  private generation = 0;
  private warmStream: MediaStream | null = null;
  private warmContext: AudioContext | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private frame = 0;
  private cancel: (() => void) | null = null;

  get available() { return Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof window.AudioContext === 'function'); }

  /** 触发权限弹窗并预热音频链路，让第一次跟读也不用等。 */
  async prepare() {
    if (!this.available) throw new Error('这台浏览器暂时不能使用麦克风。请在 localhost 或 HTTPS 页面中打开游戏。');
    await this.acquire();
    this.scheduleIdleRelease();
  }

  private async acquire(): Promise<{ stream: MediaStream; context: AudioContext }> {
    this.clearIdleRelease();
    if (this.warmStream?.active && this.warmContext && this.warmContext.state !== 'closed') {
      if (this.warmContext.state === 'suspended') await this.warmContext.resume();
      return { stream: this.warmStream, context: this.warmContext };
    }
    this.release();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    const context = new AudioContext();
    await context.resume();
    this.warmStream = stream;
    this.warmContext = context;
    return { stream, context };
  }

  private scheduleIdleRelease() {
    this.clearIdleRelease();
    this.idleTimer = setTimeout(() => this.release(), IDLE_RELEASE_MS);
  }

  private clearIdleRelease() { clearTimeout(this.idleTimer); this.idleTimer = undefined; }

  private release() {
    this.clearIdleRelease();
    cancelAnimationFrame(this.frame);
    this.warmStream?.getTracks().forEach(track => track.stop());
    this.warmStream = null;
    const context = this.warmContext;
    this.warmContext = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  async listen(onLevel: (level: number) => void): Promise<VoiceResult> {
    this.stop();
    const generation = this.generation;
    if (!this.available) throw new Error('这台浏览器暂时不能使用麦克风。可以切换「我读好了」模式。');
    let stream: MediaStream;
    let context: AudioContext;
    try {
      ({ stream, context } = await this.acquire());
    } catch (error) {
      if (generation !== this.generation) return 'cancelled';
      const name = error instanceof DOMException ? error.name : '';
      const messages: Record<string, string> = {
        NotAllowedError: '麦克风没有获得许可。可以允许麦克风，或切换「我读好了」模式继续玩。',
        NotFoundError: '没有找到麦克风。接上麦克风，或切换「我读好了」模式。',
        NotReadableError: '麦克风可能被其他应用占用。可以先用「我读好了」模式继续。',
      };
      throw new Error(messages[name] ?? '暂时没有连上麦克风。可以重试，或切换「我读好了」模式。');
    }
    if (generation !== this.generation) return 'cancelled';
    try {
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      return await new Promise<VoiceResult>(resolve => {
        const start = performance.now();
        let previous = start;
        let lastSound = start;
        let voicedMs = 0;
        let background = .006;
        let settled = false;
        const finish = (result: VoiceResult) => {
          if (settled) return;
          settled = true;
          this.cancel = null;
          onLevel(0);
          this.scheduleIdleRelease();
          resolve(result);
        };
        this.cancel = () => finish('cancelled');
        const tick = (now: number) => {
          if (generation !== this.generation) { finish('cancelled'); return; }
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) sum += sample * sample;
          const rms = Math.sqrt(sum / samples.length);
          onLevel(Math.min(1, rms * 12));
          const elapsed = Math.min(now - previous, 80);
          previous = now;
          if (now - start < 180) background = Math.min(.02, background * .8 + rms * .2);
          const threshold = Math.max(.014, Math.min(.05, background * 2.3));
          if (now - start > 180 && rms > threshold) {
            voicedMs += elapsed;
            lastSound = now;
          }
          if (voicedMs >= 260 && now - lastSound > 650) { finish('heard'); return; }
          if (voicedMs >= 3000) { finish('heard'); return; }
          if (now - start >= 12000) { finish(voicedMs >= 260 ? 'heard' : 'silent'); return; }
          this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
      });
    } catch (error) {
      if (generation !== this.generation) return 'cancelled';
      throw error;
    }
  }

  /** 取消当前监听。麦克风保持热身（闲置 30 秒后自动释放），下一步跟读零等待。 */
  stop() {
    this.generation += 1;
    const cancel = this.cancel;
    this.cancel = null;
    cancel?.();
    this.scheduleIdleRelease();
  }

  /** 彻底释放麦克风（页面隐藏、关闭时）。 */
  dispose() {
    this.generation += 1;
    this.cancel?.();
    this.cancel = null;
    this.release();
  }
}
