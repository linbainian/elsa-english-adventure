import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import type { Adventure } from './Adventure';
import type { Step, Toy, World } from './level';

export const TOY_BACKGROUNDS: Partial<Record<World, string>> = {
  'toys-room': 'toys/playroom', 'toys-station': 'toys/station', 'toys-parade': 'toys/parade',
};
export const TOY_SPRITES = ['ball', 'teddy', 'doll', 'car', 'train', 'blocks', 'wagon'].map(toy => 'toys/' + toy);
const texture = (toy: Toy) => 'theme-toys/' + toy;
const GOLD = 0xffd97e, CORAL = 0xffa8ae, MINT = 0xa9e8d8;
type Home = { x: number; y: number; size: number };
type Slot = [Toy, number, number, number];
const SLOTS: Partial<Record<World, Slot[]>> = {
  'toys-room': [['ball', 710, 548, 155], ['teddy', 920, 550, 225], ['doll', 1120, 550, 220]],
  'toys-station': [['blocks', 675, 535, 145], ['car', 835, 570, 190], ['train', 1085, 560, 260]],
  'toys-parade': [['doll', 675, 457, 165], ['teddy', 890, 462, 185], ['blocks', 1100, 458, 135],
    ['ball', 675, 582, 125], ['car', 870, 585, 190], ['train', 1120, 580, 250]],
};

/** A toy theatre: the same word has a different visible consequence in each act. */
export class ToyDirector {
  private objects = new Set<Phaser.GameObjects.GameObject>();
  private transient = new Set<Phaser.GameObjects.GameObject>();
  private timers: Phaser.Time.TimerEvent[] = [];
  private toys = new Map<Toy, Phaser.GameObjects.Image>();
  private shadows = new Map<Toy, Phaser.GameObjects.Ellipse>();
  private homes = new Map<Toy, Home>();
  private rabbit: AnimatedActor | null = null;
  private focus: Phaser.GameObjects.Container | null = null;
  private track: Phaser.GameObjects.Graphics | null = null;
  private world: World | null = null;

  constructor(private scene: Phaser.Scene, private adventure: Adventure,
    private hero: AnimatedActor, private buddy: AnimatedActor, private reduced: boolean) {}

  private keep<T extends Phaser.GameObjects.GameObject>(object: T, temporary = false): T {
    (temporary ? this.transient : this.objects).add(object);
    object.once('destroy', () => { this.objects.delete(object); this.transient.delete(object); });
    return object;
  }
  private remove(object: Phaser.GameObjects.GameObject) {
    this.scene.tweens.killTweensOf(object);
    if (object instanceof Phaser.GameObjects.Container) object.list.forEach(child => this.scene.tweens.killTweensOf(child));
    object.destroy();
  }
  private later(ms: number, action: () => void) { this.timers.push(this.scene.time.delayedCall(ms, action)); }
  private clearTurn() {
    this.timers.forEach(timer => timer.remove()); this.timers = [];
    [...this.transient].forEach(object => this.remove(object));
    this.focus = null;
  }
  clear() {
    this.clearTurn(); [...this.objects].forEach(object => this.remove(object));
    this.toys.clear(); this.shadows.clear(); this.homes.clear();
    this.rabbit = null; this.track = null; this.world = null;
  }

  build(world: World) {
    this.clear(); this.world = world;
    this.hero.setPosition(200, 565).setScale(.85);
    this.buddy.setVisible(false);
    this.rabbit = this.keep(new AnimatedActor(this.scene, 440, 559, 230, {
      idle: 'theme-body/rabbit-idle', clap: 'theme-body/rabbit-clap',
      nose: 'theme-body/rabbit-nose', cheer: 'theme-body/rabbit-clap',
    }, this.reduced));
    for (const [toy, x, y, size] of SLOTS[world] ?? []) {
      const shadow = this.keep(this.scene.add.ellipse(x, y - 3, size * .65, size * .10, 0x776582, .12).setDepth(2));
      const image = this.keep(this.scene.add.image(x, y, texture(toy)).setOrigin(.5, 1).setDisplaySize(size, size).setDepth(y > 550 ? 8 : 5));
      if (toy === 'car' || toy === 'train') image.setFlipX(true);
      this.toys.set(toy, image); this.shadows.set(toy, shadow); this.homes.set(toy, { x, y, size });
    }
    if (world === 'toys-station') {
      this.track = this.keep(this.scene.add.graphics().setDepth(1));
      const repaired = this.adventure.state.completed.includes('t-blocks');
      this.drawTrack(repaired);
      if (repaired) this.makeBridge(false);
    }
  }

  showStep(step: Step) {
    this.clearTurn();
    this.rabbit?.idle();
    if (!step.moment) return;
    for (const [toy, image] of this.toys) {
      const home = this.homes.get(toy)!;
      const known = this.world === 'toys-parade' || step.moment.focus === toy || this.adventure.state.completed.some(id =>
        this.adventure.level.steps.find(item => item.id === id)?.moment?.focus === toy);
      this.scene.tweens.killTweensOf(image);
      image.setDisplaySize(home.size, home.size).setAngle(0).setAlpha(known ? 1 : .16);
      this.scene.tweens.add({ targets: image, x: home.x, y: home.y, duration: this.reduced ? 0 : 500, ease: 'Sine.InOut' });
      const shadow = this.shadows.get(toy)!;
      this.scene.tweens.killTweensOf(shadow);
      shadow.setPosition(home.x, home.y - 3).setScale(1).setAlpha(known ? 1 : .25);
    }
    const toy = this.toys.get(step.moment.focus as Toy);
    const home = this.homes.get(step.moment.focus as Toy);
    const ring = this.scene.add.ellipse(0, 0, home ? home.size * 1.15 : 570, home ? 85 : 125, GOLD, .12).setStrokeStyle(3, 0xfffae4, .8);
    const star = this.scene.add.star(home ? home.size * .55 : 275, -22, 5, 6, 15, GOLD).setStrokeStyle(2, 0xffffff);
    this.focus = this.keep(this.scene.add.container(toy?.x ?? 900, home ? home.y - home.size * .45 : 500, [ring, star]).setDepth(11), true);
    if (!this.reduced) this.scene.tweens.add({ targets: this.focus, alpha: .5, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  respond(step: Step): number {
    if (this.focus) { this.remove(this.focus); this.focus = null; }
    const type = step.moment?.type;
    const toy = this.toys.get(step.moment?.focus as Toy);
    this.hero.perform('cast'); this.rabbit?.hold('clap');
    switch (type) {
      case 'toy-ball-bounce':
        if (toy) this.bounce(toy, 'ball', 100);
        break;
      case 'toy-teddy-hug':
        if (toy) {
          this.scene.tweens.add({ targets: toy, x: 585, duration: 1000, ease: 'Sine.InOut' });
          this.scene.tweens.add({ targets: this.shadows.get('teddy'), x: 585, duration: 1000, ease: 'Sine.InOut' });
          this.later(1000, () => { this.wiggle(toy); this.hearts(535, 350, 4); });
        }
        break;
      case 'toy-doll-spin':
        if (toy) this.twirl(toy);
        break;
      case 'toy-ball-roll':
        if (toy) {
          this.scene.tweens.add({ targets: toy, x: 565, angle: -230, duration: 900, yoyo: true, ease: 'Sine.InOut' });
          this.scene.tweens.add({ targets: this.shadows.get('ball'), x: 565, duration: 900, yoyo: true, ease: 'Sine.InOut' });
          this.later(900, () => { this.rabbit?.hold('nose'); this.burst(565, 490, MINT); this.sound('bounce'); });
        }
        break;
      case 'toy-blocks-build':
        this.makeBridge(true);
        this.later(1300, () => { this.drawTrack(true); this.burst(825, 540, GOLD); });
        break;
      case 'toy-car-drive':
        if (toy) {
          this.scene.tweens.add({ targets: [toy, this.shadows.get('car')], x: 1140, duration: 1100, yoyo: true, ease: 'Sine.InOut',
            onYoyo: () => toy.setFlipX(false), onComplete: () => toy.setFlipX(true) });
          for (let i = 0; i < 3; i++) this.later(i * 420, () => this.burst(870 + i * 85, 535, GOLD, 4));
          this.sound('engine');
        }
        break;
      case 'toy-train-start':
        if (toy) {
          this.wiggle(toy); this.smoke(toy.x + 65, toy.y - 160); this.sound('whistle');
          this.scene.tweens.add({ targets: [toy, this.shadows.get('train')], x: 1020, duration: 1000, yoyo: true, ease: 'Sine.InOut' });
        }
        break;
      case 'toy-train-ride':
        this.trainRide();
        break;
      case 'toy-doll-conduct':
        if (toy) { this.twirl(toy); this.confetti(850, 250); this.burst(toy.x, 285, GOLD); }
        break;
      case 'toy-teddy-cheer':
        if (toy) { this.wiggle(toy); this.hearts(toy.x, toy.y - 150, 6); }
        break;
      case 'toy-ball-confetti':
        if (toy) { this.bounce(toy, 'ball', 135); this.later(350, () => this.confetti(860, 280)); }
        break;
      case 'toy-car-carry':
        this.carRide();
        break;
      case 'toy-parade':
        this.parade();
        break;
    }
    this.later(2300, () => this.rabbit?.idle());
    return type === 'toy-parade' ? 4200 : type === 'toy-train-ride' ? 3400 : 2800;
  }

  private drawTrack(repaired: boolean) {
    if (!this.track) return;
    this.track.clear().lineStyle(5, 0xdeb778, .8);
    for (const y of [561, 578]) {
      if (repaired) this.track.lineBetween(600, y, 1230, y);
      else { this.track.lineBetween(600, y, 760, y); this.track.lineBetween(890, y, 1230, y); }
    }
    this.track.lineStyle(3, 0x936c54, .55);
    for (let x = 610; x < 1230; x += 28) if (repaired || x < 760 || x > 890) this.track.lineBetween(x, 555, x - 5, 584);
  }
  private makeBridge(animated: boolean) {
    // The generated blocks teach the noun; simple movable construction pieces form the bridge.
    const pieces = [[760, 552, 42, 88, CORAL], [885, 552, 42, 88, MINT], [823, 504, 175, 35, GOLD]];
    pieces.forEach(([x, y, width, height, color], index) => {
      const art = this.scene.add.graphics();
      art.fillStyle(color!).fillRoundedRect(-width! / 2, -height!, width!, height!, 9);
      art.fillStyle(0xffffff, .25).fillRoundedRect(-width! / 2 + 6, -height! + 5, width! - 12, 9, 4);
      const piece = this.keep(this.scene.add.container(x!, animated ? y! - 100 : y!, [art]).setDepth(3).setAlpha(animated ? 0 : 1));
      if (animated) this.scene.tweens.add({ targets: piece, y, alpha: 1, duration: 500, delay: index * 330, ease: this.reduced ? 'Sine.Out' : 'Bounce.Out',
        onComplete: () => { this.burst(x!, y! - 40, color!, 4); this.sound('build'); } });
    });
  }

  private trainRide() {
    this.toys.get('train')?.setAlpha(0); this.shadows.get('train')?.setAlpha(0);
    // Park the remaining toys out of the travelling composition so the three passengers are clear.
    for (const toy of ['car', 'blocks'] as Toy[]) { this.toys.get(toy)?.setAlpha(0); this.shadows.get(toy)?.setAlpha(0); }
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (const [index, toy] of (['ball', 'teddy', 'doll'] as Toy[]).entries()) {
      const x = index * 100;
      const passenger = this.scene.add.image(x, -40, texture(toy)).setOrigin(.5, 1).setDisplaySize(toy === 'ball' ? 60 : 85, toy === 'ball' ? 60 : 85);
      const cart = this.scene.add.image(x, 2, 'theme-toys/wagon').setOrigin(.5, 1).setDisplaySize(114, 114);
      parts.push(passenger, cart);
    }
    parts.push(this.scene.add.image(360, 2, texture('train')).setOrigin(.5, 1).setDisplaySize(255, 255).setFlipX(true));
    const train = this.keep(this.scene.add.container(590, 560, parts).setDepth(10), true);
    this.scene.tweens.add({ targets: train, x: 720, duration: 1500, yoyo: true, ease: 'Sine.InOut' });
    this.smoke(1030, 385); this.sound('whistle');
    this.later(1400, () => this.burst(1090, 430, GOLD));
  }
  private carRide() {
    this.toys.get('car')?.setAlpha(0); this.toys.get('teddy')?.setAlpha(0);
    this.shadows.get('car')?.setAlpha(0); this.shadows.get('teddy')?.setAlpha(0);
    const car = this.scene.add.image(0, 0, texture('car')).setOrigin(.5, 1).setDisplaySize(210, 210).setFlipX(true);
    const bear = this.scene.add.image(-20, -125, texture('teddy')).setOrigin(.5, 1).setDisplaySize(95, 95);
    const shadow = this.scene.add.ellipse(0, -3, 155, 19, 0x776582, .14);
    const ride = this.keep(this.scene.add.container(775, 630, [shadow, car, bear]).setDepth(10), true);
    this.scene.tweens.add({ targets: ride, x: 930, duration: 2300, ease: 'Sine.InOut' });
    if (!this.reduced) this.scene.tweens.add({ targets: bear, angle: { from: -7, to: 7 }, duration: 250, yoyo: true, repeat: 3 });
    this.hearts(900, 345, 3); this.sound('engine');
  }
  private parade() {
    for (const [index, [toy, image]] of [...this.toys.entries()].entries()) {
      const home = this.homes.get(toy)!;
      image.setAlpha(1);
      this.scene.tweens.add({ targets: image, x: home.x + 30, y: home.y - (toy === 'ball' ? 35 : 8),
        angle: toy === 'ball' ? 180 : index % 2 ? 4 : -4, duration: this.reduced ? 850 : 1400,
        delay: index * 110, yoyo: true, ease: 'Sine.InOut' });
    }
    this.rabbit?.hold('clap'); this.hero.perform('cheer');
    this.confetti(870, 240); this.hearts(890, 290, 4); this.sound('parade');
  }

  private bounce(image: Phaser.GameObjects.Image, toy: Toy, height: number) {
    const home = this.homes.get(toy)!;
    const shadow = this.shadows.get(toy)!;
    this.scene.tweens.add({ targets: image, y: home.y - (this.reduced ? 25 : height), duration: 350, yoyo: true, repeat: this.reduced ? 0 : 2, ease: 'Sine.Out' });
    this.scene.tweens.add({ targets: shadow, scaleX: .55, alpha: .45, duration: 350, yoyo: true, repeat: this.reduced ? 0 : 2 });
    for (let i = 0; i < (this.reduced ? 1 : 3); i++) this.later(700 * (i + 1), () => { this.burst(image.x, home.y - 12, CORAL, 5); this.sound('bounce'); });
  }
  private wiggle(image: Phaser.GameObjects.Image) {
    if (this.reduced) { this.burst(image.x, image.y - 110, GOLD, 4); return; }
    this.scene.tweens.add({ targets: image, angle: { from: -5, to: 5 }, duration: 230, repeat: 2, yoyo: true, ease: 'Sine.InOut', onComplete: () => image.setAngle(0) });
  }
  private twirl(image: Phaser.GameObjects.Image) {
    const homeY = image.y;
    if (!this.reduced) {
      const sx = image.scaleX;
      this.scene.tweens.add({ targets: image, y: homeY - 25, angle: 12, duration: 450, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
      this.scene.tweens.add({ targets: image, scaleX: sx * .72, duration: 300, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
    }
    for (let i = 0; i < 3; i++) this.later(i * 450, () => this.burst(image.x - 55 + i * 45, homeY - 160, GOLD, 7));
  }
  private smoke(x: number, y: number) {
    for (let i = 0; i < (this.reduced ? 1 : 4); i++) this.later(i * 230, () => {
      const cloud = this.keep(this.scene.add.circle(x, y, 13, 0xffffff, .8).setDepth(13), true);
      this.scene.tweens.add({ targets: cloud, x: x + 30, y: y - 90, scale: 2.2, alpha: 0, duration: 1250, ease: 'Sine.Out', onComplete: () => cloud.destroy() });
    });
  }
  private burst(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < (this.reduced ? 3 : count); i++) {
      const star = this.keep(this.scene.add.star(x, y, 5, 3, 8, color).setDepth(15), true);
      const angle = i * Math.PI * 2 / count;
      this.scene.tweens.add({ targets: star, x: x + Math.cos(angle) * 65, y: y + Math.sin(angle) * 50 - 25,
        scale: .2, alpha: 0, duration: 950, ease: 'Sine.Out', onComplete: () => star.destroy() });
    }
  }
  private hearts(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.later(i * 170, () => {
      const heart = this.keep(this.scene.add.image(x - 80 + i * 28, y + i % 2 * 20, 'theme-themes/balloon').setDisplaySize(65, 65).setDepth(16), true);
      this.scene.tweens.add({ targets: heart, y: heart.y - 90, alpha: 0, duration: 1600, ease: 'Sine.Out', onComplete: () => heart.destroy() });
    });
  }
  private confetti(x: number, y: number) {
    for (let i = 0; i < (this.reduced ? 6 : 23); i++) {
      const paper = this.keep(this.scene.add.rectangle(x - 260 + i * 24, y, 10, 24, [CORAL, MINT, GOLD, 0xc4b0ef][i % 4]).setAngle(i * 25).setDepth(14), true);
      this.scene.tweens.add({ targets: paper, x: paper.x + (i % 2 ? 30 : -30), y: y + 250, angle: i * 25 + 120, alpha: 0,
        duration: 2400 + i % 3 * 170, ease: 'Sine.InOut', onComplete: () => paper.destroy() });
    }
  }
  private sound(type: string) { this.adventure.dispatchEvent(new CustomEvent('theme-sound', { detail: type })); }
  celebrate() { this.parade(); }
}
