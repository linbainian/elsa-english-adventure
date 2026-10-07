import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import type { Adventure } from './Adventure';
import type { Clothing, Step, WardrobeChange, WardrobeLook, World } from './level';

export const WARDROBE_BACKGROUNDS: Partial<Record<World, string>> = {
  'wardrobe-closet': 'wardrobe/closet', 'wardrobe-garden': 'wardrobe/garden', 'wardrobe-ball': 'wardrobe/ball',
};
export const WARDROBE_SPRITES = ['dress', 'shoes', 'hat', 'shirt', 'skirt', 'coat', 'shoes-sparkle', 'frame',
  ...['casual', 'dress', 'shirt', 'skirt', 'coat', 'ballgown'].map(look => 'outfit-' + look)].map(name => 'wardrobe/' + name);
const key = (name: string) => 'theme-wardrobe/' + name;
const ORIGINAL = { idle: 'princess-idle', wave: 'princess-cheer', cheer: 'princess-cheer', cast: 'princess-cast' };
const GOLD = 0xffd98a, PINK = 0xffb5cb, MINT = 0xb2ecdd;
type Worn = { look: WardrobeLook; hat: boolean; shoes: 'plain' | 'pink' | 'sparkle' };

/** Costume layers travel with the main actor; scene-time actions pause together with speech. */
export class WardrobeDirector {
  private objects = new Set<Phaser.GameObjects.GameObject>();
  private temporary = new Set<Phaser.GameObjects.GameObject>();
  private timers: Phaser.Time.TimerEvent[] = [];
  private ownedHero = false;
  private head: Phaser.GameObjects.Image | null = null;
  private hat: Phaser.GameObjects.Image | null = null;
  private shoes: Phaser.GameObjects.Image | null = null;
  private hands: Phaser.GameObjects.Image[] = [];
  private rabbit: AnimatedActor | null = null;
  private prop: Phaser.GameObjects.Image | null = null;
  private focus: Phaser.GameObjects.Container | null = null;
  private mirror: Phaser.GameObjects.Container | null = null;
  private rain: Phaser.Time.TimerEvent | null = null;
  private worn: Worn = { look: 'casual', hat: false, shoes: 'plain' };

  constructor(private scene: Phaser.Scene, private adventure: Adventure,
    private hero: AnimatedActor, private buddy: AnimatedActor, private reduced: boolean) {}

  private keep<T extends Phaser.GameObjects.GameObject>(object: T, temporary = false): T {
    (temporary ? this.temporary : this.objects).add(object);
    object.once('destroy', () => { this.objects.delete(object); this.temporary.delete(object); });
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
    [...this.temporary].forEach(object => this.remove(object));
    this.prop = null; this.focus = null;
  }
  clear() {
    this.clearTurn(); this.rain?.remove(); this.rain = null;
    [...this.objects].forEach(object => this.remove(object));
    this.head = this.hat = this.shoes = null; this.hands = []; this.rabbit = null; this.mirror = null;
    if (this.ownedHero) {
      this.scene.tweens.killTweensOf(this.hero);
      this.hero.setDepth(6);
      this.hero.setTextures(ORIGINAL);
      this.ownedHero = false;
      this.adventure.dispatchEvent(new CustomEvent('wardrobe-state', { detail: { active: false, texture: this.hero.art.texture.key, actorFrameWidth: this.hero.art.frame.width } }));
    }
  }

  build(_world: World) {
    this.clear(); this.ownedHero = true;
    this.worn = { look: 'casual', hat: false, shoes: 'plain' };
    for (const id of this.adventure.state.completed) {
      const change = this.adventure.steps.find(step => step.id === id)?.moment?.wardrobe;
      if (change) this.worn = { ...this.worn, ...change };
    }
    this.hero.setPosition(775, 580).setScale(1.16).setAngle(0).setDepth(8);
    this.hero.faceLeft(false);
    this.buddy.setVisible(false);
    // A runtime crop retains the original face; generated garments cover the cropped neckline.
    this.head = this.keep(this.scene.add.image(0, 0, 'princess-idle', '__BASE').setOrigin(.5, 1)
      .setDisplaySize(810, 405).setCrop(455, 0, 120, 123));
    this.hero.addAt(this.head, 1);
    // A frame added to the portrait's texture becomes its default frame in Phaser.
    // Give the hand its own texture so later head crops and old princess poses keep the full image.
    if (!this.scene.textures.exists('wardrobe-hand')) {
      const original = this.scene.textures.get('princess-idle').getSourceImage('__BASE') as HTMLImageElement;
      this.scene.textures.addImage('wardrobe-hand', original)?.add('hand', 0, 465, 254, 19, 29);
    }
    for (const flip of [false, true]) {
      const hand = this.keep(this.scene.add.image(0, 0, 'wardrobe-hand', 'hand').setOrigin(.5, 0).setDisplaySize(14, 22).setFlipX(flip));
      this.hands.push(hand); this.hero.add(hand);
    }
    this.hat = this.keep(this.scene.add.image(4, -362, key('hat')).setOrigin(.5, 1).setDisplaySize(150, 150));
    this.shoes = this.keep(this.scene.add.image(0, -9, key('shoes')).setOrigin(.5, 1).setDisplaySize(74, 32));
    this.hero.add([this.shoes, this.hat]);
    this.apply({}, false);
    this.rabbit = this.keep(new AnimatedActor(this.scene, 555, 584, 215, {
      idle: 'theme-body/rabbit-idle', cheer: 'theme-body/rabbit-clap', clap: 'theme-body/rabbit-clap',
    }, this.reduced));
    this.rabbit.setDepth(7);
  }

  update() {
    if (!this.ownedHero) return;
    const float = this.hero.art.y;
    this.head?.setY(float); this.hat?.setY(-362 + float); this.shoes?.setY(-9 + float);
    this.handPositions().forEach(([x, y], i) => this.hands[i]?.setPosition(x, y + float));
  }

  private handPositions(): [number, number][] {
    const points: Record<WardrobeLook, [number, number][]> = {
      casual: [[-76, -186], [80, -186]], dress: [[-83, -186], [83, -186]],
      shirt: [[-80, -186], [83, -186]], skirt: [[-78, -188], [78, -188]],
      coat: [[-75, -192], [78, -192]], ballgown: [[-65, -203], [78, -203]],
    };
    return points[this.worn.look];
  }

  private apply(change: WardrobeChange, animate = true) {
    this.worn = { ...this.worn, ...change };
    const texture = key('outfit-' + this.worn.look);
    this.hero.setTextures({ idle: texture }, animate && !this.reduced ? 360 : 0);
    this.hat?.setVisible(this.worn.hat);
    this.shoes?.setTexture(key(this.worn.shoes === 'sparkle' ? 'shoes-sparkle' : 'shoes')).setVisible(this.worn.shoes !== 'plain');
    const announce = () => this.adventure.dispatchEvent(new CustomEvent('wardrobe-state', {
      detail: { active: true, ...this.worn, texture: this.hero.art.texture.key,
        portraitFrame: this.head?.frame.name, portraitFrameWidth: this.head?.frame.width, actorFrameWidth: this.hero.art.frame.width },
    }));
    if (animate && !this.reduced) this.later(390, announce); else announce();
  }

  showStep(step: Step) {
    this.clearTurn();
    this.scene.tweens.killTweensOf(this.hero);
    this.hero.setPosition(775, 580).setScale(1.16).setAngle(0).idle();
    this.rabbit?.idle();
    if (!step.moment || step.moment.focus === 'clothes') return;
    const item = step.moment.focus as Clothing;
    if (['wardrobe-mirror', 'wardrobe-portrait'].includes(step.moment.type)) {
      this.mark(1080, 392, 255); return;
    }
    this.prop = this.keep(this.scene.add.image(1090, 450, key(item)).setOrigin(.5, 1)
      .setDisplaySize(item === 'hat' ? 185 : 170, item === 'hat' ? 185 : 170).setDepth(10), true);
    if (step.moment.type === 'wardrobe-ballgown') this.prop.setTexture(key('outfit-ballgown')).setDisplaySize(440, 220);
    this.mark(1090, 369, 195);
    if (!this.reduced) this.scene.tweens.add({ targets: this.prop, y: 444, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private mark(x: number, y: number, width: number) {
    const halo = this.scene.add.ellipse(0, 0, width, 155, GOLD, .10).setStrokeStyle(3, 0xfff7df, .8);
    const star = this.scene.add.star(width / 2 - 6, -64, 5, 6, 14, GOLD).setStrokeStyle(2, 0xffffff);
    this.focus = this.keep(this.scene.add.container(x, y, [halo, star]).setDepth(9), true);
    if (!this.reduced) this.scene.tweens.add({ targets: this.focus, alpha: .55, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  respond(step: Step): number {
    if (this.focus) { this.remove(this.focus); this.focus = null; }
    const type = step.moment?.type;
    this.rabbit?.hold('clap');
    const change = step.moment?.wardrobe;
    if (change && type !== 'wardrobe-hat-away') {
      this.flyToActor(step.moment!.focus as Clothing);
      this.later(720, () => { this.apply(change); this.burst(775, change.hat ? 135 : change.shoes ? 560 : 375, PINK, 12); this.sound('dress'); });
    }
    switch (type) {
      case 'wardrobe-dress':
      case 'wardrobe-shirt':
      case 'wardrobe-ballgown':
        this.later(1150, () => this.sway());
        if (type === 'wardrobe-ballgown') this.later(1200, () => this.burst(790, 410, GOLD, 18));
        break;
      case 'wardrobe-shoes':
        this.later(1200, () => this.scene.tweens.add({ targets: this.hero, y: 568, duration: this.reduced ? 0 : 260, yoyo: true, repeat: 1, ease: 'Sine.InOut' }));
        break;
      case 'wardrobe-hat': this.later(1200, () => this.burst(775, 160, MINT)); break;
      case 'wardrobe-mirror': this.makePortrait(false); this.sway(); this.sound('camera'); break;
      case 'wardrobe-skirt':
        this.later(1200, () => { this.sway(); this.petals(); }); break;
      case 'wardrobe-coat': this.startRain(); break;
      case 'wardrobe-rainbow': this.rain?.remove(); this.rain = null; this.rainbow(); this.sound('dress'); break;
      case 'wardrobe-footsteps': this.later(1100, () => this.footsteps()); break;
      case 'wardrobe-hat-away': this.sendHatHome(change ?? { hat: false }); break;
      case 'wardrobe-portrait': this.makePortrait(true); this.sound('camera'); this.burst(1080, 360, GOLD); break;
      case 'wardrobe-dance': this.dance(false); break;
    }
    this.later(2600, () => this.rabbit?.idle());
    return type === 'wardrobe-dance' ? 4300 : type === 'wardrobe-footsteps' ? 3600 : 2800;
  }

  private flyToActor(item: Clothing) {
    const prop = this.prop;
    if (!prop) return;
    this.scene.tweens.killTweensOf(prop);
    this.scene.tweens.add({ targets: prop, x: 775, y: item === 'hat' ? 145 : item === 'shoes' ? 580 : 430,
      alpha: 0, scaleX: prop.scaleX * .55, scaleY: prop.scaleY * .55, angle: item === 'hat' ? -12 : 8,
      duration: this.reduced ? 0 : 900, ease: 'Sine.InOut' });
  }
  private sway() {
    if (this.reduced) return;
    this.scene.tweens.add({ targets: this.hero, angle: { from: -3, to: 3 }, duration: 470, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: () => this.hero.setAngle(0) });
  }
  private miniature(): Phaser.GameObjects.Container {
    const head = this.scene.add.image(0, 0, 'princess-idle', '__BASE').setOrigin(.5, 1).setDisplaySize(810, 405).setCrop(455, 0, 120, 123);
    const body = this.scene.add.image(0, 0, key('outfit-' + this.worn.look)).setOrigin(.5, 1).setDisplaySize(810, 405);
    const parts: Phaser.GameObjects.GameObject[] = [head, body];
    this.handPositions().forEach(([x, y], i) => parts.push(this.scene.add.image(x, y, 'wardrobe-hand', 'hand').setOrigin(.5, 0).setDisplaySize(14, 22).setFlipX(i === 1)));
    if (this.worn.shoes !== 'plain') parts.push(this.scene.add.image(0, -9, key(this.worn.shoes === 'sparkle' ? 'shoes-sparkle' : 'shoes')).setOrigin(.5, 1).setDisplaySize(74, 32));
    if (this.worn.hat) parts.push(this.scene.add.image(4, -362, key('hat')).setOrigin(.5, 1).setDisplaySize(150, 150));
    return this.scene.add.container(0, 0, parts);
  }
  private makePortrait(photo: boolean) {
    if (this.mirror) this.remove(this.mirror);
    const backing = this.scene.add.ellipse(0, -158, 230, 332, photo ? 0xeee5ff : 0xd9edf5, .88);
    const reflection = this.miniature().setPosition(0, -28).setScale(photo ? .60 : -.60, .60);
    const frame = this.scene.add.image(0, -158, key('frame')).setDisplaySize(285, 355);
    this.mirror = this.keep(this.scene.add.container(1080, 560, [backing, reflection, frame]).setDepth(10).setAlpha(0));
    this.scene.tweens.add({ targets: this.mirror, alpha: 1, duration: this.reduced ? 0 : 650, ease: 'Sine.InOut' });
    if (!photo && !this.reduced) this.scene.tweens.add({ targets: reflection, angle: { from: -2, to: 2 }, duration: 500, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
  }
  private startRain() {
    this.rain?.remove();
    this.rain = this.scene.time.addEvent({ delay: 320, loop: true, callback: () => {
      if (this.reduced) return;
      for (let i = 0; i < 3; i++) {
        const drop = this.keep(this.scene.add.ellipse(655 + Math.random() * 240, 205, 5, 14, 0xb9e7ff, .85).setDepth(11), true);
        this.scene.tweens.add({ targets: drop, y: 385 + Math.random() * 80, duration: 850, ease: 'Sine.In', onComplete: () => {
          this.scene.tweens.add({ targets: drop, y: drop.y - 24, scaleY: .5, alpha: 0, duration: 450, ease: 'Sine.Out', onComplete: () => this.remove(drop) });
        } });
      }
    } });
  }
  private rainbow() {
    const arc = this.keep(this.scene.add.graphics().setPosition(950, 315).setDepth(3).setAlpha(0));
    [0xffb4cb, 0xffd99c, 0xffefa5, 0xb6ebd5, 0xb4ddff, 0xd0bdff].forEach((color, i) => {
      arc.lineStyle(12, color, .8).beginPath().arc(0, 0, 165 - i * 12, Math.PI, Math.PI * 2).strokePath();
    });
    this.scene.tweens.add({ targets: arc, alpha: 1, duration: this.reduced ? 0 : 1000, ease: 'Sine.InOut' });
    this.burst(840, 275, GOLD);
  }
  private petals() {
    for (let i = 0; i < (this.reduced ? 3 : 12); i++) {
      const petal = this.keep(this.scene.add.ellipse(690 + Math.random() * 210, 425, 14, 8, i % 2 ? PINK : 0xd9c5ff, .8).setDepth(10), true);
      this.scene.tweens.add({ targets: petal, x: petal.x + (i % 2 ? -90 : 90), y: 550, angle: 110, alpha: 0, duration: 2100, delay: i * 60, ease: 'Sine.InOut', onComplete: () => this.remove(petal) });
    }
  }
  private footsteps() {
    for (let i = 0; i < 3; i++) this.later(i * 560, () => {
      const x = 740 + i * 40;
      this.burst(x, 583, GOLD, 5); this.sound('step');
      this.scene.tweens.add({ targets: this.hero, x, y: 571, duration: this.reduced ? 0 : 260, yoyo: true, ease: 'Sine.InOut' });
    });
  }
  private sendHatHome(change: WardrobeChange) {
    if (this.prop) { this.remove(this.prop); this.prop = null; }
    this.hat?.setVisible(false);
    const stand = this.keep(this.scene.add.graphics().setDepth(3));
    stand.lineStyle(5, GOLD, .9).lineBetween(1230, 436, 1230, 560).lineBetween(1207, 560, 1253, 560);
    stand.strokeCircle(1230, 436, 9);
    const flying = this.keep(this.scene.add.image(780, 160, key('hat')).setOrigin(.5, 1).setDisplaySize(174, 174).setDepth(12));
    this.scene.tweens.add({ targets: flying, x: 1230, y: 470, scaleX: flying.scaleX * .57, scaleY: flying.scaleY * .57, angle: 8,
      duration: this.reduced ? 0 : 1300, ease: 'Sine.InOut', onComplete: () => { this.apply(change, false); this.burst(1230, 430, MINT); } });
  }
  private dance(loop: boolean) {
    if (this.mirror) { this.remove(this.mirror); this.mirror = null; }
    const clothes: Clothing[] = ['dress', 'shoes', 'hat', 'shirt', 'skirt', 'coat'];
    const positions = [[550, 245], [615, 150], [715, 100], [880, 100], [980, 150], [1045, 245]];
    clothes.forEach((item, i) => {
      const [x, y] = positions[i]!;
      const glow = this.scene.add.circle(0, 0, 38, 0xfff7e4, .82).setStrokeStyle(2, GOLD, .8);
      const art = this.scene.add.image(0, 27, key(item)).setOrigin(.5, 1).setDisplaySize(63, 63);
      const token = this.keep(this.scene.add.container(x, y, [glow, art]).setDepth(6));
      if (!this.reduced) this.scene.tweens.add({ targets: token, y: y! - 7, duration: 1100 + i * 90, yoyo: true, repeat: loop ? -1 : 2, ease: 'Sine.InOut' });
    });
    this.sound('parade'); this.rabbit?.hold('clap');
    this.burst(790, 345, GOLD, 18);
    if (!this.reduced) {
      this.scene.tweens.add({ targets: this.hero, x: 805, angle: { from: -3, to: 3 }, duration: 750, yoyo: true, repeat: loop ? -1 : 2, ease: 'Sine.InOut' });
      if (this.rabbit) this.scene.tweens.add({ targets: this.rabbit, y: 574, angle: { from: 3, to: -3 }, duration: 540, yoyo: true, repeat: loop ? -1 : 3, ease: 'Sine.InOut' });
    }
  }
  private burst(x: number, y: number, color: number, count = 8) {
    for (let i = 0; i < (this.reduced ? 3 : count); i++) {
      const star = this.keep(this.scene.add.star(x, y, 5, 3, 8, color).setDepth(12), true);
      const angle = i / count * Math.PI * 2;
      this.scene.tweens.add({ targets: star, x: x + Math.cos(angle) * 85, y: y + Math.sin(angle) * 65, angle: 80, alpha: 0,
        duration: this.reduced ? 500 : 1200, delay: i * 20, ease: 'Sine.Out', onComplete: () => this.remove(star) });
    }
  }
  private sound(type: string) { this.adventure.dispatchEvent(new CustomEvent('theme-sound', { detail: type })); }
  celebrate() {
    this.clearTurn();
    this.scene.tweens.killTweensOf(this.hero);
    if (this.rabbit) this.scene.tweens.killTweensOf(this.rabbit);
    // Remove the previous six tokens before creating the persistent finale.
    [...this.objects].filter(object => object instanceof Phaser.GameObjects.Container && object !== this.rabbit && object !== this.mirror)
      .forEach(object => this.remove(object));
    this.dance(true);
  }
}
