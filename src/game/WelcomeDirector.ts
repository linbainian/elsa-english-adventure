import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import { SceneStory } from './SceneStory';
import type { Step, World } from './level';

export const WELCOME_BACKGROUNDS: Partial<Record<World, string>> = {
  'welcome-glade': 'snow/glade', 'welcome-palace': 'snow/palace', 'welcome-party': 'snow/orchard',
};

/** One social-language theme, with a new visible outcome for every repeated greeting. */
export class WelcomeDirector extends SceneStory {
  private world: World | null = null;
  private owl: AnimatedActor | null = null;
  private gate: Phaser.GameObjects.Image | null = null;
  private lamp: Phaser.GameObjects.Image | null = null;
  private partyStarted = false;
  private photo: Phaser.GameObjects.Container | null = null;

  override clear() {
    const active = this.world !== null;
    super.clear(); this.world = null; this.owl = null; this.gate = null; this.lamp = null; this.photo = null; this.partyStarted = false;
    if (active) this.adventure.dispatchEvent(new CustomEvent('welcome-state', { detail: { active: false } }));
  }
  private announce() {
    this.adventure.dispatchEvent(new CustomEvent('welcome-state', { detail: { active: true,
      gateOpen: this.gate?.texture.key === 'snow-gate-open', photo: Boolean(this.photo),
      owlTexture: this.owl?.art.texture.key ?? null,
    } }));
  }
  build(world: World) {
    this.clear(); this.world = world;
    this.hero.setPosition(255, 560).setScale(.84).setDepth(6).setVisible(true); this.hero.faceLeft(false);
    this.buddy.setPosition(710, 560).setScale(.93).setVisible(true).setDepth(8); this.buddy.faceLeft(false);
    if (world === 'welcome-palace') {
      this.gate = this.image(this.adventure.state.completed.includes('w-please') ? 'snow-gate-open' : 'snow-gate-closed', 990, 554, 330, false, 3);
      this.lamp = this.image('snow-lantern', 1130, 525, 120, false, 5).setAlpha(.45);
      this.buddy.setX(660);
    }
    if (world === 'welcome-party') {
      this.owl = this.keep(new AnimatedActor(this.scene, 1000, 478, 205, { idle: 'snow-owl' }, this.reduced)).setDepth(7);
      this.image('snow-globe', 1000, 554, 170, false, 8);
      for (let i = 0; i < 3; i++) this.image('theme-themes/balloon', 740 + i * 150, 240 + i % 2 * 20, 115, false, 3);
    }
    this.announce();
  }
  showStep(step: Step) {
    this.clearTurn(); this.buddy.idle(); this.owl?.idle();
    this.scene.tweens.killTweensOf(this.buddy); this.buddy.setAngle(0).setScale(.93);
    if (step.moment?.type === 'welcome-owl-peek') this.owl?.setAlpha(0);
    if (step.moment?.type === 'welcome-gift') this.image('theme-themes/gift', 790, 554, 150, true);
    const focus = step.moment?.type.startsWith('welcome-owl') || step.moment?.type === 'welcome-snowflake' ? this.owl : this.buddy;
    if (step.moment?.type === 'welcome-door' || step.moment?.type === 'welcome-knock') this.mark(990, 408, 300);
    else if (step.moment?.type === 'welcome-lantern') this.mark(1130, 465, 150);
    else this.mark(focus?.x ?? 710, (focus?.y ?? 560) - 130, 225);
    this.announce();
  }
  respond(step: Step): number {
    this.unmark(); this.hero.perform('wave');
    const type = step.moment?.type;
    switch (type) {
      case 'welcome-wave': this.buddy.perform('wave'); this.snowStars(680, 335); break;
      case 'welcome-name': {
        const ring = this.keep(this.scene.add.ellipse(710, 565, 180, 42, this.gold, .15).setStrokeStyle(3, 0xfff8da).setDepth(3), true);
        this.scene.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 2200, ease: 'Sine.Out' });
        this.buddy.perform('cheer'); this.hearts(710, 310); break;
      }
      case 'welcome-depart':
        for (let i = 0; i < 4; i++) {
          const ball = this.keep(this.scene.add.circle(600 - i * 55, 552, 14, 0xf6fcff).setStrokeStyle(2, 0xbfe9f6).setDepth(9), true);
          this.scene.tweens.add({ targets: ball, x: 935 - i * 40, y: 555, duration: 1500, delay: i * 200, ease: 'Sine.InOut' });
        }
        this.scene.tweens.add({ targets: this.buddy, x: 850, duration: 2000, ease: 'Sine.InOut' });
        this.later(1800, () => this.buddy.perform('wave')); this.sound('bounce'); break;
      case 'welcome-gift': {
        const gift = [...this.temporary].find(o => o instanceof Phaser.GameObjects.Image && o.texture.key === 'theme-themes/gift');
        if (gift) this.scene.tweens.add({ targets: gift, angle: { from: -5, to: 5 }, duration: 160, yoyo: true, repeat: 2 });
        this.later(800, () => {
          if (gift) this.remove(gift);
          for (let i = 0; i < 3; i++) {
            const balloon = this.image('theme-themes/balloon', 790 + i * 30, 475, 125, true, 13);
            this.scene.tweens.add({ targets: balloon, x: 700 + i * 90, y: 235 - i * 25, duration: 2200, ease: 'Sine.Out' });
          }
          this.buddy.perform('cheer'); this.sound('pop');
        }); break;
      }
      case 'welcome-knock':
        for (let i = 0; i < 3; i++) this.later(i * 550, () => { this.burst(990, 350 - i * 30, this.gold, 6); this.sound('bell'); });
        this.buddy.perform('wave'); break;
      case 'welcome-door':
        if (this.gate) {
          const gate = this.gate;
          this.scene.tweens.add({ targets: gate, alpha: 0, duration: 550, onComplete: () => {
            gate.setTexture('snow-gate-open');
            this.scene.tweens.add({ targets: gate, alpha: 1, duration: 700 }); this.announce();
          } });
          this.later(800, () => this.snowStars(990, 370));
        }
        this.buddy.perform('cheer'); break;
      case 'welcome-lantern':
        if (this.lamp) {
          this.scene.tweens.add({ targets: this.lamp, alpha: 1, y: 465, duration: 850, ease: 'Sine.Out' });
          const glow = this.keep(this.scene.add.circle(1130, 411, 65, this.gold, .18).setDepth(4), true);
          this.scene.tweens.add({ targets: glow, scale: 1.3, alpha: .07, duration: 1200, yoyo: true, repeat: 1 });
        }
        this.hearts(1040, 330); this.sound('bell'); break;
      case 'welcome-bow':
        this.scene.tweens.add({ targets: this.buddy, angle: 8, scaleY: .84, duration: 650, yoyo: true, ease: 'Sine.InOut' });
        this.hearts(this.buddy.x, 320); break;
      case 'welcome-owl-peek':
        if (this.owl) {
          const owl = this.owl;
          owl.setAlpha(0).setY(520);
          this.scene.tweens.add({ targets: owl, alpha: 1, y: 414, duration: 900, ease: 'Sine.Out' });
          this.later(1100, () => { this.pop(owl); this.burst(1000, 280, this.gold); this.sound('bird'); });
        } break;
      case 'welcome-owl-fly':
        if (this.owl) {
          const owl = this.owl, startY = owl.y;
          this.scene.tweens.add({ targets: owl, x: 810, duration: 2200, ease: 'Sine.InOut', onUpdate: tween => {
            owl.y = Phaser.Math.Linear(startY, 490, tween.progress) - Math.sin(tween.progress * Math.PI) * (this.reduced ? 20 : 125);
          }, onComplete: () => { owl.setY(490); this.hearts(810, 310); } });
          this.sound('bird');
        } break;
      case 'welcome-snowflake': this.snowStars(830, 320); this.owl?.perform('cheer'); this.buddy.perform('cheer'); break;
      case 'welcome-hug':
        this.scene.tweens.add({ targets: this.buddy, x: 730, duration: 1100, ease: 'Sine.InOut' });
        if (this.owl) this.scene.tweens.add({ targets: this.owl, x: 820, y: 480, duration: 1100, ease: 'Sine.InOut' });
        this.later(1100, () => this.hearts(780, 310, 5)); break;
      case 'welcome-goodbye': this.celebrate(); break;
    }
    this.announce();
    return this.reduced ? 2500 : type === 'welcome-goodbye' ? 3900 : 3200;
  }
  private snowStars(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const star = this.keep(this.scene.add.star(x, y, 6, 5, 13, 0xddfaff).setDepth(15), true);
      const a = i / 7 * Math.PI * 2;
      this.scene.tweens.add({ targets: star, x: x + Math.cos(a) * 160, y: y + Math.sin(a) * 100,
        angle: 100, alpha: 0, duration: 2500, delay: i * 100, ease: 'Sine.Out', onComplete: () => this.remove(star) });
    }
    this.sound('bell');
  }
  celebrate() {
    if (this.partyStarted) return; this.partyStarted = true;
    this.hero.perform('wave'); this.buddy.perform('wave'); this.owl?.perform('wave');
    this.later(700, () => {
      const mat = this.scene.add.rectangle(0, 0, 310, 214, 0xfef5e7).setStrokeStyle(6, this.gold);
      const friends = [
        this.scene.add.image(-72, 72, this.hero.art.texture.key).setOrigin(.5, 1).setDisplaySize(256, 128),
        this.scene.add.image(10, 72, 'snow-buddy-wave').setOrigin(.5, 1).setDisplaySize(104, 104),
        this.scene.add.image(94, 72, 'snow-owl').setOrigin(.5, 1).setDisplaySize(94, 94),
      ];
      this.photo = this.keep(this.scene.add.container(930, 280, [mat, ...friends]).setDepth(18).setScale(.3).setAlpha(0));
      this.scene.tweens.add({ targets: this.photo, scale: 1, alpha: 1, duration: 900, ease: this.reduced ? 'Sine.Out' : 'Back.Out' });
      this.hearts(660, 330, 5); this.sound('camera'); this.announce();
    });
  }
}
