import Phaser from 'phaser';
import type { Adventure } from './Adventure';
import type { AnimatedActor } from './AnimatedActor';

/** Shared ownership for authored scenes. Timers and motion follow the pausable scene clock. */
export class SceneStory {
  protected objects = new Set<Phaser.GameObjects.GameObject>();
  protected temporary = new Set<Phaser.GameObjects.GameObject>();
  protected timers: Phaser.Time.TimerEvent[] = [];
  protected focus: Phaser.GameObjects.Container | null = null;
  protected readonly gold = 0xffdb8a;

  constructor(protected scene: Phaser.Scene, protected adventure: Adventure,
    protected hero: AnimatedActor, protected buddy: AnimatedActor, protected reduced: boolean) {}

  protected keep<T extends Phaser.GameObjects.GameObject>(object: T, temporary = false): T {
    (temporary ? this.temporary : this.objects).add(object);
    object.once('destroy', () => { this.objects.delete(object); this.temporary.delete(object); });
    return object;
  }
  protected remove(object: Phaser.GameObjects.GameObject) {
    if (!object.scene) return;
    this.scene.tweens.killTweensOf(object);
    if (object instanceof Phaser.GameObjects.Container) object.list.forEach(child => this.scene.tweens.killTweensOf(child));
    object.destroy();
  }
  protected later(ms: number, action: () => void) { this.timers.push(this.scene.time.delayedCall(ms, action)); }
  protected clearTurn() {
    this.timers.forEach(timer => timer.remove()); this.timers = [];
    [...this.temporary].forEach(object => this.remove(object)); this.focus = null;
  }
  clear() {
    if (this.objects.size || this.temporary.size) {
      this.scene.tweens.killTweensOf(this.hero); this.scene.tweens.killTweensOf(this.buddy);
      this.hero.idle(); this.buddy.idle();
    }
    this.clearTurn(); [...this.objects].forEach(object => this.remove(object));
    this.objects.clear();
  }
  protected image(texture: string, x: number, y: number, size: number, temporary = false, depth = 9) {
    return this.keep(this.scene.add.image(x, y, texture).setOrigin(.5, 1).setDisplaySize(size, size).setDepth(depth), temporary);
  }
  protected mark(x: number, y: number, width = 230) {
    const ring = this.scene.add.ellipse(0, 0, width, width * .78, this.gold, .06).setStrokeStyle(3, 0xfff7df, .9);
    const star = this.scene.add.star(width * .5, -width * .3, 5, 5, 13, this.gold).setStrokeStyle(2, 0xffffff);
    this.focus = this.keep(this.scene.add.container(x, y, [ring, star]).setDepth(16), true);
    if (!this.reduced) this.scene.tweens.add({ targets: this.focus, alpha: .6, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  protected unmark() { if (this.focus) { this.remove(this.focus); this.focus = null; } }
  protected sound(type: string) { this.adventure.dispatchEvent(new CustomEvent('theme-sound', { detail: type })); }
  protected pop(actor: Phaser.GameObjects.Container) {
    const x = actor.scaleX, y = actor.scaleY;
    this.scene.tweens.add({ targets: actor, scaleX: x * 1.04, scaleY: y * .97, duration: 260, yoyo: true, ease: 'Sine.InOut' });
  }
  protected burst(x: number, y: number, color = this.gold, count = 8) {
    for (let i = 0; i < (this.reduced ? 3 : count); i++) {
      const angle = i / count * Math.PI * 2;
      const star = this.keep(this.scene.add.star(x, y, 5, 3, 8, color).setDepth(18), true);
      this.scene.tweens.add({ targets: star, x: x + Math.cos(angle) * 90, y: y + Math.sin(angle) * 65,
        alpha: 0, angle: 75, duration: 1300, ease: 'Sine.Out', onComplete: () => this.remove(star) });
    }
  }
  protected hearts(x: number, y: number, count = 3) {
    for (let i = 0; i < count; i++) this.later(i * 360, () => {
      const heart = this.scene.add.graphics().setDepth(18);
      heart.fillStyle(0xffaccb); heart.fillCircle(-7, -5, 9); heart.fillCircle(7, -5, 9);
      heart.fillTriangle(-15, -3, 15, -3, 0, 17);
      this.keep(heart.setPosition(x + (i - (count - 1) / 2) * 35, y), true);
      this.scene.tweens.add({ targets: heart, y: y - 95, alpha: 0, scale: 1.3, duration: 1900, ease: 'Sine.Out', onComplete: () => this.remove(heart) });
    });
  }
  protected bubbles(x: number, y: number, smiles = false) {
    for (let i = 0; i < 7; i++) this.later(i * 280, () => {
      const r = 14 + i % 3 * 5;
      const circle = this.scene.add.circle(0, 0, r, 0xa6ecf4, .2).setStrokeStyle(2, 0xe5fdff, .95);
      const shine = this.scene.add.arc(-r * .32, -r * .35, r * .3, 190, 275, false).setStrokeStyle(2, 0xffffff, .95);
      const children: Phaser.GameObjects.GameObject[] = [circle, shine];
      if (smiles) {
        children.push(this.scene.add.circle(-r * .3, -3, 2, 0x648788), this.scene.add.circle(r * .3, -3, 2, 0x648788));
        children.push(this.scene.add.arc(0, 1, r * .38, 0, 180, false).setStrokeStyle(2, 0x648788));
      }
      const bubble = this.keep(this.scene.add.container(x, y, children).setDepth(19), true);
      this.scene.tweens.add({ targets: bubble, x: x + (i % 2 ? 95 : -85), y: y - 180 - i % 3 * 30,
        alpha: 0, duration: 2200, ease: 'Sine.Out', onComplete: () => this.remove(bubble) });
    });
  }
}
