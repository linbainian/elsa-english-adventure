import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import type { ActorTextures } from './AnimatedActor';
import type { Adventure } from './Adventure';
import type { Animal, Step, World } from './level';

export const ANIMAL_BACKGROUNDS: Partial<Record<World, string>> = {
  'animals-shelter': 'animals/shelter', 'animals-pond': 'animals/pond', 'animals-camp': 'animals/camp',
};
export const ANIMAL_SPRITES = ['cat', 'dog', 'rabbit', 'bird', 'duck', 'fish',
  'cat-sleep', 'dog-play', 'rabbit-sleep', 'bird-fly', 'duck-swim', 'fish-swim',
  'bed', 'ball', 'brush', 'aquarium', 'leaf', 'tent'].map(name => 'animals/' + name);
const key = (name: string) => 'theme-animals/' + name;
const FRIENDS: Animal[] = ['cat', 'dog', 'rabbit', 'bird', 'duck', 'fish'];
const GOLD = 0xffdb8a, MINT = 0xa9eee2, PINK = 0xffb7ca;
type Home = { x: number; y: number; size: number };
type Slot = [Animal, number, number, number];
const SLOTS: Partial<Record<World, Slot[]>> = {
  'animals-shelter': [['cat', 730, 547, 210], ['dog', 905, 550, 225], ['rabbit', 1110, 548, 210]],
  'animals-pond': [['bird', 710, 314, 155], ['duck', 875, 426, 185], ['fish', 1090, 600, 175]],
  'animals-camp': [['cat', 650, 505, 190], ['dog', 845, 537, 220], ['rabbit', 1000, 443, 185],
    ['bird', 800, 327, 145], ['duck', 665, 622, 170], ['fish', 1184, 554, 100]],
};
const POSES: Record<Animal, Partial<ActorTextures>> = {
  cat: { sleep: key('cat-sleep') }, dog: { wave: key('dog-play'), cheer: key('dog-play') },
  rabbit: { sleep: key('rabbit-sleep') }, bird: { glide: key('bird-fly'), cheer: key('bird-fly') },
  duck: { glide: key('duck-swim') }, fish: { glide: key('fish-swim'), cheer: key('fish-swim') },
};

/** Six friends with authored care/play actions. All movement and delays use pausable scene time. */
export class AnimalDirector {
  private objects = new Set<Phaser.GameObjects.GameObject>();
  private temporary = new Set<Phaser.GameObjects.GameObject>();
  private timers: Phaser.Time.TimerEvent[] = [];
  private animals = new Map<Animal, AnimatedActor>();
  private homes = new Map<Animal, Home>();
  private rabbit: AnimatedActor | null = null;
  private focus: Phaser.GameObjects.Container | null = null;
  private world: World | null = null;
  private bed: Phaser.GameObjects.Image | null = null;
  private partyStarted = false;

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
    [...this.temporary].forEach(object => this.remove(object)); this.focus = null;
  }
  clear() {
    const active = this.world !== null;
    this.clearTurn(); [...this.objects].forEach(object => this.remove(object));
    this.animals.clear(); this.homes.clear(); this.rabbit = null; this.bed = null;
    this.world = null; this.partyStarted = false;
    if (active) this.adventure.dispatchEvent(new CustomEvent('animal-state', { detail: { active: false } }));
  }

  private friends() {
    const completed = this.adventure.state.completed;
    return FRIENDS.filter(animal => completed.some(id => this.adventure.steps.find(step => step.id === id)?.moment?.focus === animal));
  }
  private announce() {
    const fish = this.animals.get('fish');
    const habitat = this.world === 'animals-pond' ? 'pond' : this.world === 'animals-camp' ? 'aquarium' : null;
    // Report the real rendered sprites so preview/tests can catch missing frames and pose changes.
    this.adventure.dispatchEvent(new CustomEvent('animal-state', { detail: {
      active: true, friends: this.friends(), fishHabitat: habitat,
      fishInWater: !fish || (habitat === 'pond' ? fish.x >= 580 && fish.y >= 490 && fish.y <= 650
        : habitat === 'aquarium' && fish.x >= 1150 && fish.x <= 1215 && fish.y >= 530 && fish.y <= 565),
      textures: Object.fromEntries([...this.animals].map(([animal, actor]) => [animal, actor.art.texture.key])),
      frameWidths: [...this.animals.values()].map(actor => actor.art.frame.width),
    } }));
  }
  private image(name: string, x: number, y: number, size: number, temporary = false, depth = 9) {
    return this.keep(this.scene.add.image(x, y, key(name)).setOrigin(.5, 1).setDisplaySize(size, size).setDepth(depth), temporary);
  }
  private shadow(actor: AnimatedActor, visible: boolean) {
    (actor.list[0] as Phaser.GameObjects.Ellipse).setVisible(visible);
  }

  build(world: World) {
    this.clear(); this.world = world;
    const pond = world === 'animals-pond';
    this.hero.setPosition(185, pond ? 342 : 560).setScale(pond ? .57 : .84).setDepth(6);
    this.hero.faceLeft(false); this.buddy.setVisible(false);
    this.rabbit = this.keep(new AnimatedActor(this.scene, pond ? 375 : 410, pond ? 344 : 560, pond ? 155 : 210, {
      idle: 'theme-body/rabbit-idle', clap: 'theme-body/rabbit-clap', cheer: 'theme-body/rabbit-clap',
    }, this.reduced)).setDepth(7);
    if (world === 'animals-shelter') {
      this.image('bed', 730, 556, 245, false, 3);
      this.image('bed', 1110, 559, 240, false, 3);
    }
    if (pond) {
      const perch = this.keep(this.scene.add.graphics().setDepth(3));
      perch.lineStyle(12, 0x966d50).lineBetween(710, 318, 710, 426);
      perch.lineStyle(10, 0xc69b70).lineBetween(653, 311, 776, 311);
      perch.lineStyle(3, 0xf1d5a1).lineBetween(662, 309, 770, 309);
    }
    if (world === 'animals-camp') {
      this.image('aquarium', 1184, 598, 195, false, 5);
      this.bed = this.image('bed', 1000, 550, 208, false, 3);
      this.fireflies(20, false);
    }
    for (const [animal, x, y, size] of SLOTS[world] ?? []) {
      const actor = this.keep(new AnimatedActor(this.scene, x, y, size, { idle: key(animal), ...POSES[animal] }, this.reduced));
      actor.setDepth(y > 570 ? 9 : 6);
      if (animal === 'fish') { actor.setDepth(8); this.shadow(actor, false); }
      this.animals.set(animal, actor); this.homes.set(animal, { x, y, size });
    }
    if (world === 'animals-shelter' && !this.adventure.state.completed.includes('a-cat')) this.animals.get('cat')?.hold('sleep');
    this.announce();
  }

  showStep(step: Step) {
    this.clearTurn(); this.rabbit?.idle();
    const type = step.moment?.type;
    for (const [animal, actor] of this.animals) {
      const home = this.homes.get(animal)!;
      this.scene.tweens.killTweensOf(actor);
      actor.setScale(1).setAngle(0).setAlpha(1);
      actor.faceLeft(false);
      this.scene.tweens.add({ targets: actor, x: home.x, y: home.y, duration: this.reduced ? 0 : 450, ease: 'Sine.InOut' });
      actor.idle(); this.shadow(actor, animal !== 'fish');
      if (animal === 'cat' && type === 'animal-cat-wake') actor.hold('sleep');
      if (animal === 'duck' && this.world === 'animals-pond') { actor.hold('glide'); this.shadow(actor, false); }
      if (animal === 'bird' && this.world === 'animals-camp') { actor.hold('glide'); this.shadow(actor, false); }
      if (animal === 'rabbit' && this.world === 'animals-camp' && this.adventure.state.completed.includes('a-rabbit-bed') && type !== 'animal-party') actor.hold('sleep');
    }
    const animal = this.animals.get(step.moment?.focus as Animal);
    const home = this.homes.get(step.moment?.focus as Animal);
    if (type === 'animal-cat-peek' && animal) {
      animal.setAlpha(0);
      this.image('tent', home!.x, 557, 240, true, 5);
    }
    if (type === 'animal-dog-fetch') this.image('ball', 990, 545, 75, true);
    if (type === 'animal-duck-paddle') this.image('leaf', 720, 426, 130, true, 5);
    if (type !== 'animal-party') this.mark(home?.x ?? 900, home ? home.y - home.size * .47 : 430, home?.size ?? 300);
    this.announce(); this.later(480, () => this.announce());
  }
  private mark(x: number, y: number, size: number) {
    const ring = this.scene.add.ellipse(0, 0, size * 1.1, size * .82, GOLD, .08).setStrokeStyle(3, 0xfff8dc, .8);
    const star = this.scene.add.star(size * .52, -size * .25, 5, 5, 13, GOLD).setStrokeStyle(2, 0xffffff);
    this.focus = this.keep(this.scene.add.container(x, y, [ring, star]).setDepth(12), true);
    if (!this.reduced) this.scene.tweens.add({ targets: this.focus, alpha: .55, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  respond(step: Step): number {
    if (this.focus) { this.remove(this.focus); this.focus = null; }
    const actor = this.animals.get(step.moment?.focus as Animal);
    const type = step.moment?.type;
    this.hero.perform('wave'); this.rabbit?.hold('clap');
    switch (type) {
      case 'animal-cat-wake':
        actor?.idle();
        if (actor) {
          this.scene.tweens.add({ targets: actor, scaleX: .94, scaleY: 1.06, duration: this.reduced ? 300 : 680, yoyo: true, ease: 'Sine.InOut' });
          this.hearts(actor.x, actor.y - 190); this.sound('purr');
        }
        break;
      case 'animal-dog-fetch': if (actor) this.fetch(actor); break;
      case 'animal-rabbit-hop': if (actor) this.hop(actor, 965, 550); break;
      case 'animal-cat-peek': {
        const tent = [...this.temporary].find(object => object instanceof Phaser.GameObjects.Image && object.texture.key === key('tent')) as Phaser.GameObjects.Image | undefined;
        if (tent) this.scene.tweens.add({ targets: tent, x: 790, angle: 8, duration: 750, ease: 'Sine.InOut' });
        if (actor) {
          actor.setX(630); this.scene.tweens.add({ targets: actor, alpha: 1, x: 625, duration: 650, ease: 'Sine.Out' });
          this.later(650, () => { actor.perform('wave'); this.burst(actor.x, actor.y - 125, PINK); this.sound('pop'); });
        }
        break;
      }
      case 'animal-bird-fly': if (actor) this.fly(actor); break;
      case 'animal-duck-paddle': if (actor) this.paddle(actor); break;
      case 'animal-fish-swim': if (actor) this.swim(actor); break;
      case 'animal-fish-window': this.fishWindow(); break;
      case 'animal-cat-groom': if (actor) this.groom(actor); break;
      case 'animal-dog-shake':
        if (actor) {
          actor.hold('wave');
          this.scene.tweens.add({ targets: actor, angle: { from: -3, to: 3 }, duration: 130, yoyo: true, repeat: this.reduced ? 0 : 5, ease: 'Sine.InOut', onComplete: () => actor.setAngle(0) });
          for (let i = 0; i < 6; i++) this.later(i * 170, () => this.bubble(actor.x + (i % 2 ? 75 : -75), actor.y - 105 - i % 3 * 20, true));
          this.sound('pond');
        }
        break;
      case 'animal-rabbit-rest':
        if (actor) {
          this.hop(actor, 1000, 532);
          this.homes.set('rabbit', { ...this.homes.get('rabbit')!, x: 1000, y: 532 });
          this.later(1450, () => { actor.hold('sleep'); this.hearts(1000, 393); this.sound('purr'); });
          this.later(1800, () => this.announce());
          this.bed?.setAlpha(1);
        }
        break;
      case 'animal-duck-duet': if (actor) this.duet(actor); break;
      case 'animal-party': this.celebrate(); break;
    }
    this.announce(); this.later(450, () => this.announce());
    return this.reduced ? 2200 : type === 'animal-party' ? 4200 : type === 'animal-fish-window' ? 3400 : 2900;
  }
  private sound(type: string) { this.adventure.dispatchEvent(new CustomEvent('theme-sound', { detail: type })); }

  private fetch(dog: AnimatedActor) {
    [...this.temporary].filter(object => object instanceof Phaser.GameObjects.Image && object.texture.key === key('ball')).forEach(object => this.remove(object));
    dog.hold('wave');
    const ball = this.image('ball', 0, -58, 60, true);
    dog.add(ball); ball.setPosition(-61, -67);
    this.scene.tweens.add({ targets: dog, x: 558, duration: this.reduced ? 700 : 1350, ease: 'Sine.InOut', onUpdate: tween => {
      dog.y = 550 - Math.sin(tween.progress * Math.PI * 6) * (this.reduced ? 0 : 9);
    }, onComplete: () => {
      dog.y = 550; dog.remove(ball);
      this.scene.add.existing(ball);
      // Transfer the same ball from the puppy's mouth to the companion, without teleporting it.
      ball.setPosition(dog.x - 61, dog.y - 67);
      this.scene.tweens.add({ targets: ball, x: 455, y: 467, duration: 400, ease: 'Sine.InOut' });
      this.rabbit?.perform('cheer'); this.hearts(510, 380); this.sound('bounce');
    } });
  }
  private hop(actor: AnimatedActor, x: number, y: number) {
    const startY = actor.y;
    this.scene.tweens.add({ targets: actor, x, duration: this.reduced ? 700 : 1300, ease: 'Sine.InOut', onUpdate: tween => {
      actor.y = Phaser.Math.Linear(startY, y, tween.progress) - Math.abs(Math.sin(tween.progress * Math.PI * 2)) * (this.reduced ? 7 : 60);
    }, onComplete: () => { actor.y = y; this.burst(x, y - 10, MINT, 6); this.sound('bounce'); } });
  }
  private fly(bird: AnimatedActor) {
    bird.hold('glide'); this.shadow(bird, false); this.sound('bird');
    const startX = bird.x, startY = bird.y;
    this.scene.tweens.add({ targets: bird, x: 990, duration: this.reduced ? 1000 : 1250, yoyo: true, ease: 'Sine.InOut', onUpdate: tween => {
      bird.y = startY - Math.sin(tween.progress * Math.PI) * (this.reduced ? 30 : 100);
    }, onYoyo: () => bird.faceLeft(true), onComplete: () => {
      bird.setPosition(startX, startY); bird.faceLeft(false); bird.idle(); this.shadow(bird, true); this.burst(startX, startY - 30, GOLD, 6);
    } });
    if (!this.reduced) this.scene.tweens.add({ targets: bird.art, scaleX: bird.art.scaleX * .94, duration: 160, yoyo: true, repeat: 13, ease: 'Sine.InOut' });
  }
  private ripple(x: number, y: number, temporary = true) {
    const ring = this.keep(this.scene.add.ellipse(x, y, 50, 15).setStrokeStyle(3, 0xe5fcff, .7).setDepth(4), temporary);
    this.scene.tweens.add({ targets: ring, scaleX: 3.2, scaleY: 2.3, alpha: 0, duration: 1500, ease: 'Sine.Out', onComplete: () => ring.destroy() });
  }
  private paddle(duck: AnimatedActor) {
    duck.hold('glide'); this.shadow(duck, false);
    const leaf = [...this.temporary].find(object => object instanceof Phaser.GameObjects.Image && object.texture.key === key('leaf')) as Phaser.GameObjects.Image | undefined;
    duck.faceLeft(true);
    this.scene.tweens.add({ targets: duck, x: 1060, y: 424, duration: this.reduced ? 1200 : 2400, ease: 'Sine.InOut' });
    if (leaf) this.scene.tweens.add({ targets: leaf, x: 906, y: 426, angle: 4, duration: this.reduced ? 1200 : 2400, ease: 'Sine.InOut' });
    for (let i = 0; i < 6; i++) this.later(i * 350, () => this.ripple(duck.x - 30, 421));
    this.sound('pond');
  }
  private swim(fish: AnimatedActor) {
    fish.hold('glide'); this.sound('pond');
    const hoop = this.keep(this.scene.add.circle(875, 535, 66, 0xa5f5ed, .06).setStrokeStyle(5, 0xd7ffff, .85).setDepth(7), true);
    this.keep(this.scene.add.arc(855, 512, 28, 175, 255, false).setStrokeStyle(4, 0xffffff, .9).setDepth(8), true);
    this.scene.tweens.add({ targets: hoop, scaleY: .86, duration: 850, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    this.scene.tweens.add({ targets: fish, x: 760, y: 591, duration: this.reduced ? 1300 : 2400, ease: 'Sine.InOut', onComplete: () => this.burst(770, 525, MINT, 7) });
    for (let i = 0; i < 6; i++) this.later(i * 330, () => this.bubble(fish.x + 35, fish.y - 90));
  }
  private fishWindow() {
    const glass = this.scene.add.circle(0, 0, 135, 0x46cbd2, .91).setStrokeStyle(8, 0xe7fbff, .95);
    const fish = this.scene.add.image(0, 74, key('fish-swim')).setOrigin(.5, 1).setDisplaySize(220, 220);
    const shine = this.scene.add.arc(-65, -62, 42, 180, 265, false).setStrokeStyle(9, 0xffffff, .65);
    const window = this.keep(this.scene.add.container(860, 302, [glass, fish, shine]).setDepth(18).setScale(.3).setAlpha(0), true);
    this.scene.tweens.add({ targets: window, scale: 1, alpha: 1, y: 290, duration: 800, ease: this.reduced ? 'Sine.Out' : 'Back.Out' });
    this.scene.tweens.add({ targets: fish, x: { from: 15, to: -15 }, angle: -4, duration: 1000, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    this.hearts(1060, 275); this.sound('pop');
    this.later(2700, () => this.scene.tweens.add({ targets: window, alpha: 0, scale: .6, duration: 600, ease: 'Sine.In' }));
  }
  private groom(cat: AnimatedActor) {
    const brush = this.image('brush', cat.x + 70, cat.y - 115, 115, true, 12).setAngle(-25);
    this.scene.tweens.add({ targets: brush, x: cat.x - 20, y: cat.y - 85, angle: 5, duration: 620, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    this.later(550, () => { cat.hold('sleep'); this.hearts(cat.x, cat.y - 170); });
    this.sound('purr');
  }
  private duet(duck: AnimatedActor) {
    const bird = this.animals.get('bird');
    const y = duck.y;
    this.scene.tweens.add({ targets: duck, x: duck.x + 65, angle: { from: -5, to: 5 }, duration: 560, yoyo: true, repeat: 1, ease: 'Sine.InOut', onUpdate: tween => {
      duck.y = y - Math.sin(tween.progress * Math.PI) * (this.reduced ? 3 : 12);
    }, onComplete: () => duck.setY(y).setAngle(0) });
    if (bird) {
      bird.hold('glide'); this.shadow(bird, false);
      const x = bird.x, startY = bird.y;
      this.scene.tweens.add({ targets: bird, x: duck.x + 80, y: 435, duration: 1050, yoyo: true, ease: 'Sine.InOut', onComplete: () => { bird.setPosition(x, startY); bird.idle(); } });
    }
    this.burst(770, 390, GOLD); this.sound('parade');
  }
  private burst(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < (this.reduced ? 3 : count); i++) {
      const star = this.keep(this.scene.add.star(x, y, 5, 3, 10, color).setDepth(16), true);
      const angle = i * Math.PI * 2 / count;
      this.scene.tweens.add({ targets: star, x: x + Math.cos(angle) * 75, y: y + Math.sin(angle) * 55 - 25,
        alpha: 0, scale: .2, duration: 1200, ease: 'Sine.Out', onComplete: () => star.destroy() });
    }
  }
  private bubble(x: number, y: number, stars = false) {
    const orb = this.scene.add.circle(0, 0, 16, 0xd8faff, .35).setStrokeStyle(2, 0xf7ffff, .9);
    const shine = this.scene.add.arc(-4, -4, 6, 175, 270, false).setStrokeStyle(2, 0xffffff, .85);
    const group = this.keep(this.scene.add.container(x, y, [orb, shine]).setDepth(14), true);
    this.scene.tweens.add({ targets: group, x: x + 15, y: y - (this.reduced ? 35 : 90), alpha: .2,
      duration: 1200, ease: 'Sine.Out', onComplete: () => { if (stars) this.burst(group.x, group.y, GOLD, 3); group.destroy(); } });
  }
  private hearts(x: number, y: number) {
    for (let i = 0; i < 3; i++) this.later(i * 250, () => {
      const heart = this.keep(this.scene.add.image(x - 40 + i * 40, y + i % 2 * 20, 'theme-themes/balloon').setDisplaySize(50, 50).setDepth(16), true);
      this.scene.tweens.add({ targets: heart, y: heart.y - 55, alpha: 0, duration: 1900, ease: 'Sine.Out', onComplete: () => heart.destroy() });
    });
  }
  private fireflies(count: number, party: boolean) {
    for (let i = 0; i < (this.reduced ? 5 : count); i++) {
      const x = 510 + i * 37 % 670, y = 180 + i * 47 % 270;
      const glow = this.keep(this.scene.add.circle(x, y, party ? 5 : 3, GOLD, .6).setDepth(2), party);
      if (!this.reduced) this.scene.tweens.add({ targets: glow, x: x + 18, y: y - 20, alpha: .15,
        duration: 1000 + i % 4 * 270, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }
  celebrate() {
    if (this.partyStarted) return;
    this.partyStarted = true; this.rabbit?.hold('clap'); this.hero.perform('cheer');
    this.fireflies(24, true); this.sound('parade');
    for (const [animal, actor] of this.animals) {
      actor.setAlpha(1).idle();
      if (animal === 'fish') {
        actor.hold('glide');
        if (!this.reduced) this.scene.tweens.add({ targets: actor, x: 1174, y: 550, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else if (animal === 'bird') {
        actor.hold('glide'); this.shadow(actor, false);
        if (!this.reduced) this.scene.tweens.add({ targets: actor, y: actor.y - 22, angle: 4, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else if (!this.reduced) this.scene.tweens.add({ targets: actor, angle: { from: -3, to: 3 }, scaleY: .98,
        duration: 700 + FRIENDS.indexOf(animal) * 70, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.burst(actor.x, actor.y - this.homes.get(animal)!.size * .7, GOLD, 6);
    }
    this.announce();
  }
}
