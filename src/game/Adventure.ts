import { LEVELS, acceptsText } from './level';
import type { LevelConfig, Step } from './level';

export type Phase = 'intro' | 'playing' | 'celebrating' | 'complete';
export type InputMode = 'voice' | 'read' | 'type';
export type AdventureState = {
  phase: Phase;
  levelId: number;
  index: number;
  stars: number;
  collected: number;
  name: string;
  mode: InputMode;
  paused: boolean;
  completed: string[];
  learned: string[];
};

export class Adventure extends EventTarget {
  state: AdventureState = this.freshState();

  private freshState(levelId = this.state?.levelId ?? 1): AdventureState {
    return { phase: 'intro', levelId, index: 0, stars: 0, collected: 0, name: 'Leo', mode: 'voice', paused: false, completed: [], learned: [] };
  }

  get level(): LevelConfig { return LEVELS.find(level => level.id === this.state.levelId) ?? LEVELS[0]!; }
  get steps(): Step[] { return this.level.steps; }
  get step(): Step { return this.steps[Math.min(this.state.index, this.steps.length - 1)]!; }
  get act() { return this.level.acts[this.step.act]!; }

  private notify(type = 'change', detail?: unknown) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /** 在开场界面切换关卡（仅在未开始时可切换）。 */
  setLevel(levelId: number) {
    if (this.state.phase !== 'intro' || !LEVELS.some(level => level.id === levelId) || levelId === this.state.levelId) return;
    this.state = { ...this.freshState(levelId), mode: this.state.mode };
    this.notify('level');
    this.notify();
  }

  start() {
    if (this.state.phase !== 'intro') return;
    this.state.phase = 'playing';
    this.notify();
  }

  restart() {
    const { mode, levelId } = this.state;
    this.state = { ...this.freshState(levelId), mode };
    this.notify('restart');
    this.notify();
  }

  setMode(mode: InputMode) { this.state.mode = mode; this.notify('mode'); }
  pause(paused: boolean) { this.state.paused = paused; this.notify('pause'); }

  private canAct() { return this.state.phase === 'playing' && !this.state.paused; }

  spoken() {
    if (this.canAct() && this.step.kind !== 'action') this.succeed('voice');
  }

  read() {
    if (this.canAct() && this.step.kind === 'say') this.succeed('read');
  }

  text(value: string): boolean {
    if (!this.canAct() || this.step.kind !== 'say') return false;
    if (!acceptsText(this.step, value)) {
      this.notify('retry', '再试一次就好。可以照着上面的英语输入，也可以切换成跟读模式。');
      return false;
    }
    if (this.step.matcher === 'name') this.state.name = value.replace(/^(my name is|i'm|i am)\s+/i, '').trim().slice(0, 24);
    this.succeed('type');
    return true;
  }

  choose(id: string) {
    if (!this.canAct() || this.step.kind !== 'choose') return;
    if (id !== this.step.answer) {
      this.notify('retry', '再听听雪宝的提示。选错也没关系，再找一次吧！');
      return;
    }
    this.succeed('choose');
  }

  action(action: 'jump' | 'right') {
    if (this.canAct() && this.step.kind === 'action' && this.step.action === action) this.succeed(action);
  }

  collect() {
    if (this.state.paused || this.state.phase === 'complete' || this.state.phase === 'intro' || this.state.collected >= 3) return;
    this.state.collected += 1;
    this.state.stars += 1;
    this.notify('collect');
  }

  private succeed(source: string) {
    if (!this.canAct()) return;
    this.state.phase = 'celebrating';
    this.state.completed.push(this.step.id);
    this.state.stars += 1;
    if (this.level.starStepIds.includes(this.step.id)) this.state.collected = Math.min(3, this.state.collected + 1);
    const word = this.step.target ?? this.step.npc;
    if (!this.state.learned.includes(word)) this.state.learned.push(word);
    this.notify('success', { step: this.step, source });
    this.notify();
  }

  continue() {
    if (this.state.phase !== 'celebrating' || this.state.paused) return;
    this.state.index = Math.min(this.state.index + 1, this.steps.length);
    this.state.phase = this.state.index >= this.steps.length ? 'complete' : 'playing';
    this.notify();
    if (this.state.phase === 'complete') this.notify('complete');
  }
}
