import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import { ToyDirector, TOY_BACKGROUNDS, TOY_SPRITES } from './ToyDirector';
import { WardrobeDirector, WARDROBE_BACKGROUNDS, WARDROBE_SPRITES } from './WardrobeDirector';
import { AnimalDirector, ANIMAL_BACKGROUNDS, ANIMAL_SPRITES } from './AnimalDirector';
import { WelcomeDirector, WELCOME_BACKGROUNDS } from './WelcomeDirector';
import { CommunityDirector, COMMUNITY_BACKGROUNDS, COMMUNITY_SPRITES } from './CommunityDirector';
import type { Adventure } from './Adventure';
import type { BodyPart, FamilyMember, Step, World } from './level';

export const THEME_BACKGROUNDS: Partial<Record<World, string>> = {
  ...TOY_BACKGROUNDS,
  ...WARDROBE_BACKGROUNDS,
  ...ANIMAL_BACKGROUNDS,
  ...WELCOME_BACKGROUNDS,
  ...COMMUNITY_BACKGROUNDS,
  'body-workshop': 'body/workshop', 'body-music': 'body/music', 'body-stage': 'body/stage',
  'family-home': 'family/living', 'family-garden': 'family/garden', 'family-photo': 'family/studio',
};
export const THEME_SPRITES = [
  ...TOY_SPRITES,
  ...WARDROBE_SPRITES,
  ...ANIMAL_SPRITES,
  ...COMMUNITY_SPRITES,
  'body/rabbit-idle', 'body/rabbit-nose', 'body/rabbit-clap', 'body/rabbit-march', 'body/rabbit-blow', 'body/rabbit-sleep',
  'family/mommy', 'family/daddy', 'family/grandma', 'family/grandpa', 'family/baby', 'family/frame',
  'themes/gift', 'themes/storybook', 'themes/balloon', 'themes/camera', 'themes/bell', 'themes/butterfly',
];
const key = (path: string) => 'theme-' + path;
const ROLES: FamilyMember[] = ['grandpa', 'mommy', 'daddy', 'grandma', 'baby'];
const GOLD = 0xffdc82, MINT = 0xbcebd9, PINK = 0xffb1d1;
const POINTS: Record<BodyPart, [number, number]> = {
  eyes: [0, -.62], nose: [0, -.58], mouth: [0, -.53], ears: [0, -.88], hands: [0, -.33], feet: [0, -.07],
};

/** Authored story actions. Each voice turn changes the world without evaluating pronunciation. */
export class ThemeDirector {
  private objects = new Set<Phaser.GameObjects.GameObject>();
  private temporary = new Set<Phaser.GameObjects.GameObject>();
  private timers: Phaser.Time.TimerEvent[] = [];
  private rabbit: AnimatedActor | null = null;
  private family = new Map<FamilyMember, AnimatedActor>();
  private focus: Phaser.GameObjects.Container | null = null;
  private prop: Phaser.GameObjects.Image | null = null;
  private world: World | null = null;
  private photo: Phaser.GameObjects.Container | null = null;
  private size = 350;
  private toys: ToyDirector;
  private wardrobe: WardrobeDirector;
  private animals: AnimalDirector;
  private welcome: WelcomeDirector;
  private community: CommunityDirector;

  constructor(
    private scene: Phaser.Scene, private adventure: Adventure,
    private hero: AnimatedActor, private buddy: AnimatedActor, private reduced: boolean,
  ) {
    this.toys = new ToyDirector(scene, adventure, hero, buddy, reduced);
    this.wardrobe = new WardrobeDirector(scene, adventure, hero, buddy, reduced);
    this.animals = new AnimalDirector(scene, adventure, hero, buddy, reduced);
    this.welcome = new WelcomeDirector(scene, adventure, hero, buddy, reduced);
    this.community = new CommunityDirector(scene, adventure, hero, buddy, reduced);
  }

  static preload(scene: Phaser.Scene) {
    Object.values(THEME_BACKGROUNDS).forEach(path => scene.load.image(key(path!), '/assets/' + path + '.webp'));
    THEME_SPRITES.forEach(path => scene.load.image(key(path), '/assets/' + path + '.png'));
  }

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
  private later(ms: number, callback: () => void) { this.timers.push(this.scene.time.delayedCall(ms, callback)); }
  update() { this.wardrobe.update(); }
  clear() {
    this.toys.clear();
    this.wardrobe.clear();
    this.animals.clear();
    this.welcome.clear();
    this.community.clear();
    this.timers.forEach(timer => timer.remove()); this.timers = [];
    [...this.objects, ...this.temporary].forEach(object => this.remove(object));
    this.objects.clear(); this.temporary.clear(); this.family.clear();
    this.rabbit = null; this.focus = null; this.prop = null; this.photo = null; this.world = null;
  }

  private newRabbit(x: number, y: number, size: number) {
    return this.keep(new AnimatedActor(this.scene, x, y, size, {
      idle: key('body/rabbit-idle'), nose: key('body/rabbit-nose'), clap: key('body/rabbit-clap'),
      march: key('body/rabbit-march'), blow: key('body/rabbit-blow'), sleep: key('body/rabbit-sleep'),
      cheer: key('body/rabbit-clap'), wave: key('body/rabbit-clap'),
    }, this.reduced));
  }

  build(world: World) {
    this.clear(); this.world = world;
    if (this.adventure.level.theme === 'toys') { this.toys.build(world); return; }
    if (this.adventure.level.theme === 'clothes') { this.wardrobe.build(world); return; }
    if (this.adventure.level.theme === 'animals') { this.animals.build(world); return; }
    if (this.adventure.level.theme === 'welcome') { this.welcome.build(world); return; }
    if (this.adventure.level.theme === 'community') { this.community.build(world); return; }
    const isBody = this.adventure.level.theme === 'body';
    this.hero.setPosition(isBody ? 265 : 190, 558).setScale(isBody ? .94 : .85);
    this.buddy.setPosition(1135, 555).setScale(.85).setVisible(isBody && world !== 'body-stage');
    this.size = isBody ? 350 : 250;
    this.rabbit = this.newRabbit(isBody ? 830 : 720, 560, this.size);
    if (isBody) {
      if (world === 'body-music') {
        for (let i = 0; i < 3; i++) this.keep(this.scene.add.image(680 + i * 150, 180, key('themes/bell')).setDisplaySize(92, 92).setDepth(4));
      }
      if (world === 'body-stage') {
        this.keep(this.scene.add.ellipse(830, 561, 660, 90, 0xffd0cf, .22).setDepth(1));
        this.buddy.setPosition(1140, 555).setVisible(this.adventure.state.completed.includes('b-review-hands'));
      }
      return;
    }
    const photo = world === 'family-photo';
    // Two depths keep the six members readable without stacking identical cards.
    const positions: Record<FamilyMember, [number, number, number]> = photo
      ? { grandpa: [500, 520, 250], mommy: [650, 535, 285], daddy: [875, 530, 310], grandma: [1050, 525, 260], baby: [950, 570, 175] }
      : { grandpa: [480, 535, 225], mommy: [595, 557, 285], daddy: [900, 551, 310], grandma: [1060, 535, 245], baby: [1100, 562, 180] };
    for (const role of ROLES) {
      const [x, y, size] = positions[role];
      const invited = photo || this.adventure.state.completed.some(id => this.adventure.level.steps.find(step => step.id === id)?.moment?.focus === role);
      const actor = this.keep(new AnimatedActor(this.scene, x, y, size, { idle: key('family/' + role) }, this.reduced)).setAlpha(invited ? 1 : .12);
      actor.setDepth(y < 500 ? 3 : 6);
      this.family.set(role, actor);
    }
    this.rabbit.setDepth(8);
    if (photo) this.prop = this.keep(this.scene.add.image(1120, 480, key('themes/camera')).setDisplaySize(110, 110).setDepth(9));
  }

  showStep(step: Step) {
    if (this.adventure.level.theme === 'toys') { this.toys.showStep(step); return; }
    if (this.adventure.level.theme === 'clothes') { this.wardrobe.showStep(step); return; }
    if (this.adventure.level.theme === 'animals') { this.animals.showStep(step); return; }
    if (this.adventure.level.theme === 'welcome') { this.welcome.showStep(step); return; }
    if (this.adventure.level.theme === 'community') { this.community.showStep(step); return; }
    if (!step.moment || !this.rabbit) return;
    this.clearFocus();
    if (this.prop && this.world !== 'family-photo') { this.remove(this.prop); this.prop = null; }
    const { type, focus } = step.moment;
    this.rabbit.idle();
    this.scene.tweens.killTweensOf(this.rabbit);
    this.rabbit.setAngle(0).setScale(1);
    if (this.adventure.level.theme === 'body') {
      if (type === 'peekaboo' || type === 'eyes-lights') this.rabbit.hold('sleep');
      const [dx, dy] = POINTS[focus as BodyPart];
      this.mark(this.rabbit.x + dx * this.size, this.rabbit.y + dy * this.size, focus === 'ears' ? 120 : focus === 'feet' ? 155 : 100);
      if (type === 'nose-mirror') {
        this.buddy.setVisible(false);
        this.keep(this.scene.add.image(1110, 390, key('family/frame')).setDisplaySize(240, 260).setDepth(10));
        this.keep(this.scene.add.image(1110, 448, key('body/rabbit-nose')).setOrigin(.5, 1).setDisplaySize(140, 140).setFlipX(true).setAlpha(.85).setDepth(11));
      }
    } else {
      const member = this.family.get(focus as FamilyMember);
      if (member) {
        if (type === 'family-grandpa-join') member.setPosition(420, 525);
        this.scene.tweens.add({ targets: member, alpha: 1, duration: 550, ease: 'Sine.InOut' });
        this.mark(member.x, member.y - (focus === 'baby' ? 100 : 180), focus === 'baby' ? 175 : 220);
      } else this.mark(810, 390, 380);
      const props: Partial<Record<string, string>> = {
        'family-gift': 'gift', 'family-story': 'storybook', 'family-balloon': 'balloon', 'family-picnic': 'gift',
      };
      const asset = props[type];
      if (asset) this.prop = this.keep(this.scene.add.image(850, 495, key('themes/' + asset)).setDisplaySize(type === 'family-story' ? 190 : 130, type === 'family-story' ? 190 : 130).setDepth(10));
    }
  }

  private clearFocus() { if (this.focus) { this.remove(this.focus); this.focus = null; } }
  private mark(x: number, y: number, width: number) {
    const ring = this.scene.add.ellipse(0, 0, width, Math.min(width, 115), GOLD, .12).setStrokeStyle(3, 0xfff9e8, .8);
    const star = this.scene.add.star(width / 2 + 12, -18, 5, 6, 15, GOLD).setStrokeStyle(2, 0xffffff);
    this.focus = this.keep(this.scene.add.container(x, y, [ring, star]).setDepth(12));
    if (!this.reduced) this.scene.tweens.add({ targets: this.focus, alpha: .55, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  respond(step: Step): number {
    if (this.adventure.level.theme === 'toys') return this.toys.respond(step);
    if (this.adventure.level.theme === 'clothes') return this.wardrobe.respond(step);
    if (this.adventure.level.theme === 'animals') return this.animals.respond(step);
    if (this.adventure.level.theme === 'welcome') return this.welcome.respond(step);
    if (this.adventure.level.theme === 'community') return this.community.respond(step);
    this.clearFocus();
    if (!this.rabbit || !step.moment) return 1000;
    const rabbit = this.rabbit;
    const { type, focus } = step.moment;
    this.hero.perform('cast');
    if (this.adventure.level.theme === 'body') {
      const point = POINTS[focus as BodyPart];
      this.burst(rabbit.x + point[0] * this.size, rabbit.y + point[1] * this.size, GOLD, 10);
      switch (type) {
        case 'nose-wiggle':
          rabbit.hold('nose'); this.wiggle(rabbit); this.hearts(rabbit.x, rabbit.y - 210, 3); break;
        case 'peekaboo':
          rabbit.idle(); this.pop(rabbit); this.burst(rabbit.x, rabbit.y - 230, MINT, 14); break;
        case 'body-bubbles': case 'mouth-stars':
          rabbit.hold('blow'); this.bubbles(rabbit.x, rabbit.y - 190, type === 'mouth-stars'); break;
        case 'nose-mirror':
          rabbit.hold('nose'); this.wiggle(rabbit); this.hearts(1080, 340, 4); this.burst(1110, 367, PINK, 12); break;
        case 'listen-bells':
          rabbit.hold('idle'); this.wiggle(rabbit);
          for (let i = 0; i < 3; i++) this.later(i * 420, () => { this.burst(680 + i * 150, 180, GOLD, 10); this.sound('bell'); });
          break;
        case 'clap-lights':
          rabbit.hold('clap');
          for (let i = 0; i < 3; i++) this.later(i * 420, () => { this.pop(rabbit); this.bubble(690 + i * 135, 350, false); this.sound('clap'); });
          break;
        case 'footprints': case 'feet-count':
          rabbit.hold('march'); this.march(rabbit);
          for (let i = 0; i < (type === 'feet-count' ? 2 : 5); i++) this.later(i * 270, () => this.footprint(680 + i * 68, 563, i % 2));
          break;
        case 'hand-ribbons':
          rabbit.hold('clap'); this.ribbons(rabbit.x, 250); this.hearts(rabbit.x, 365, 3); break;
        case 'eyes-lights':
          rabbit.idle();
          for (let i = 0; i < 3; i++) this.later(i * 250, () => this.burst(640 + i * 165, 250, GOLD, 12));
          this.pop(rabbit); break;
        case 'hands-curtain':
          rabbit.hold('clap'); this.ribbons(900, 210); this.buddy.setVisible(true).setAlpha(0);
          this.scene.tweens.add({ targets: this.buddy, alpha: 1, duration: 650, ease: 'Sine.InOut' });
          this.later(450, () => this.buddy.perform('wave')); break;
        case 'body-dance':
          rabbit.hold('march'); this.march(rabbit); this.buddy.setVisible(true); this.buddy.perform('cheer');
          this.ribbons(830, 170); this.hearts(900, 300, 5);
          this.later(1050, () => { rabbit.hold('clap'); this.hero.perform('cheer'); }); break;
      }
    } else {
      const actor = this.family.get(focus as FamilyMember) ?? rabbit;
      actor.setAlpha(1); this.pop(actor);
      switch (type) {
        case 'family-welcome':
          this.scene.tweens.add({ targets: actor, x: 650, duration: 1100, ease: 'Sine.InOut' });
          this.hearts(700, 340, 4); this.later(600, () => this.wiggle(rabbit)); break;
        case 'family-gift':
          if (this.prop) this.scene.tweens.add({ targets: this.prop, angle: { from: -6, to: 6 }, duration: 160, yoyo: true, repeat: 2 });
          this.later(650, () => { if (this.prop) this.prop.setAlpha(0); this.balloon(850, 445); this.sound('pop'); }); break;
        case 'family-introduce':
          this.wiggle(actor); this.hearts(actor.x, 340, 3); this.later(650, () => this.hero.perform('wave')); break;
        case 'family-rock':
          this.wiggle(actor); this.bubbles(actor.x, actor.y - 85); break;
        case 'family-story':
          if (this.prop) this.scene.tweens.add({ targets: this.prop, scaleX: this.prop.scaleX * 1.13, scaleY: this.prop.scaleY * 1.13, duration: 450, ease: 'Back.Out' });
          for (let i = 0; i < 4; i++) this.later(i * 220, () => this.butterfly(850, 395, i)); break;
        case 'family-balloon':
          for (let i = 0; i < 4; i++) this.later(i * 240, () => this.balloon(650 + i * 130, 400 + i % 2 * 50)); break;
        case 'family-bubbles':
          this.bubbles(actor.x, actor.y - 90); this.wiggle(actor); break;
        case 'family-picnic':
          if (this.prop) this.prop.setAlpha(0);
          ['apple', 'banana', 'pear'].forEach((asset, i) => {
            const fruit = this.keep(this.scene.add.image(850, 450, asset).setDisplaySize(65, 65).setDepth(10), true);
            this.scene.tweens.add({ targets: fruit, x: 610 + i * 190, y: 485, duration: 1050, delay: i * 180, ease: 'Sine.InOut' });
          }); break;
        case 'family-together':
          this.family.forEach(member => member.setAlpha(1)); this.hearts(800, 320, 6);
          this.family.forEach((member, role) => this.scene.tweens.add({ targets: member, x: { grandpa: 500, mommy: 630, daddy: 875, grandma: 1070, baby: 960 }[role], y: role === 'baby' ? 565 : 550, duration: 1100, ease: 'Sine.InOut' })); break;
        case 'family-photo-call':
          this.wiggle(actor); this.hearts(actor.x, actor.y - 175, 2); this.sound('pop'); break;
        case 'family-grandpa-join':
          this.scene.tweens.add({ targets: actor, x: 530, y: 550, duration: this.reduced ? 750 : 1600, ease: 'Sine.InOut' });
          this.later(1500, () => { this.hearts(530, 360, 2); this.sound('pop'); }); break;
        case 'family-photo':
          this.sound('camera'); this.burst(1120, 420, GOLD, 10);
          // A gentle iris and a real composition of the six character sprites; no white flash.
          this.later(500, () => this.makePhoto()); break;
        case 'family-love':
          if (!this.photo) this.makePhoto();
          this.hearts(820, 295, 8); this.ribbons(850, 180);
          this.family.forEach(member => this.wiggle(member)); break;
      }
    }
    this.later(1900, () => { if (rabbit.active && type !== 'body-dance') rabbit.idle(); });
    return this.reduced ? 2100 : type === 'family-photo' || type === 'family-love' || type === 'body-dance' ? 3200 : 2400;
  }

  private sound(type: string) { this.adventure.dispatchEvent(new CustomEvent('theme-sound', { detail: type })); }
  private pop(actor: AnimatedActor) {
    if (this.reduced) return;
    this.scene.tweens.add({ targets: actor, scaleX: 1.04, scaleY: .96, duration: 220, yoyo: true, ease: 'Sine.InOut' });
  }
  private wiggle(actor: AnimatedActor) {
    if (this.reduced) return;
    this.scene.tweens.add({ targets: actor, angle: { from: -3, to: 3 }, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => actor.setAngle(0) });
  }
  private march(actor: AnimatedActor) {
    if (this.reduced) { this.pop(actor); return; }
    const y = actor.y;
    this.scene.tweens.add({ targets: actor, y: y - 20, angle: 3, duration: 220, yoyo: true, repeat: 3, ease: 'Sine.InOut', onComplete: () => actor.setPosition(actor.x, y).setAngle(0) });
  }

  private burst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < (this.reduced ? 3 : count); i++) {
      const star = this.keep(this.scene.add.star(x, y, 5, 3, 9, color).setDepth(16), true);
      const angle = i * Math.PI * 2 / count;
      this.scene.tweens.add({ targets: star, x: x + Math.cos(angle) * 90, y: y + Math.sin(angle) * 60 - 25, alpha: 0, scale: .2, duration: 1100, ease: 'Sine.Out', onComplete: () => star.destroy() });
    }
  }
  private bubbles(x: number, y: number, stars = false) {
    for (let i = 0; i < 6; i++) this.later(i * 200, () => this.bubble(x + (i % 2 ? 30 : -25), y - i % 3 * 15, stars));
  }
  private bubble(x: number, y: number, stars: boolean) {
    const color = [PINK, MINT, 0xd8c4ff][Math.floor(Math.random() * 3)]!;
    const orb = this.scene.add.circle(0, 0, 25, color, .35).setStrokeStyle(3, 0xffffff, .9);
    const shine = this.scene.add.arc(-7, -8, 10, 185, 265, false).setStrokeStyle(3, 0xffffff, .8);
    const group = this.keep(this.scene.add.container(x, y, [orb, shine]).setDepth(15), true);
    this.scene.tweens.add({ targets: group, x: x + 70 + Math.random() * 80, y: y - 150, scale: 1.3, duration: this.reduced ? 1000 : 1650, ease: 'Sine.Out', onComplete: () => {
      if (stars) this.burst(group.x, group.y, GOLD, 5);
      group.destroy();
    } });
  }
  private hearts(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.later(i * 150, () => {
      const heart = this.keep(this.scene.add.image(x - 90 + i * 30, y + i % 2 * 30, key('themes/balloon')).setDisplaySize(70, 70).setDepth(16).setAlpha(0), true);
      this.scene.tweens.add({ targets: heart, y: heart.y - 80, alpha: .9, duration: 650, ease: 'Sine.Out', onComplete: () => {
        this.scene.tweens.add({ targets: heart, alpha: 0, duration: 950, onComplete: () => heart.destroy() });
      } });
    });
  }
  private balloon(x: number, y: number) {
    const balloon = this.keep(this.scene.add.image(x, y, key('themes/balloon')).setDisplaySize(140, 140).setDepth(14), true);
    this.scene.tweens.add({ targets: balloon, y: y - 230, x: x + 40, angle: 8, alpha: .15, duration: this.reduced ? 1200 : 2600, ease: 'Sine.InOut', onComplete: () => balloon.destroy() });
  }
  private butterfly(x: number, y: number, index: number) {
    const butterfly = this.keep(this.scene.add.image(x, y, key('themes/butterfly')).setDisplaySize(70, 70).setDepth(14), true);
    this.scene.tweens.add({ targets: butterfly, x: x - 200 + index * 140, y: y - 130 - index % 2 * 40, alpha: 0, duration: 2000, ease: 'Sine.Out', onComplete: () => butterfly.destroy() });
    if (!this.reduced) this.scene.tweens.add({ targets: butterfly, scaleX: butterfly.scaleX * .65, duration: 150, yoyo: true, repeat: 8 });
  }
  private footprint(x: number, y: number, side: number) {
    const foot = this.keep(this.scene.add.ellipse(x, y, 29, 52, side ? PINK : MINT, .85).setAngle(side ? 15 : -15).setDepth(2).setScale(.1), true);
    this.scene.tweens.add({ targets: foot, scale: 1, duration: 300, ease: 'Back.Out' });
    this.later(1600, () => this.scene.tweens.add({ targets: foot, alpha: 0, duration: 500, onComplete: () => foot.destroy() }));
  }
  private ribbons(x: number, y: number) {
    for (let i = 0; i < (this.reduced ? 5 : 16); i++) {
      const strip = this.keep(this.scene.add.rectangle(x - 220 + i * 30, y, 10, 30, [PINK, MINT, GOLD, 0xd8c4ff][i % 4]).setAngle(i * 17).setDepth(14), true);
      this.scene.tweens.add({ targets: strip, x: strip.x + (i % 2 ? 55 : -55), y: y + 230 + i % 3 * 20, angle: i * 17 + 110, alpha: 0, duration: 2000 + i % 3 * 180, ease: 'Sine.InOut', onComplete: () => strip.destroy() });
    }
  }
  private makePhoto() {
    if (this.photo) return;
    const paper = this.scene.add.rectangle(0, 0, 570, 290, 0xfffaf2).setStrokeStyle(10, 0xffdca6);
    const backdrop = this.scene.add.rectangle(0, -18, 535, 230, 0x514373);
    const parts: Phaser.GameObjects.GameObject[] = [paper, backdrop];
    const members = ['grandpa', 'mommy', 'rabbit-idle', 'daddy', 'grandma', 'baby'];
    members.forEach((member, i) => parts.push(this.scene.add.image(-215 + i * 84, 68, key(member === 'rabbit-idle' ? 'body/' + member : 'family/' + member)).setOrigin(.5, 1).setDisplaySize(i === 5 ? 100 : 145, i === 5 ? 100 : 145)));
    parts.push(this.scene.add.star(0, 123, 5, 8, 18, GOLD));
    this.photo = this.keep(this.scene.add.container(830, 320, parts).setDepth(19).setScale(.25).setAlpha(0).setAngle(-4));
    this.scene.tweens.add({ targets: this.photo, scale: 1, alpha: 1, angle: -2, duration: 950, ease: 'Back.Out' });
  }

  celebrate() {
    if (this.adventure.level.theme === 'toys') { this.toys.celebrate(); return; }
    if (this.adventure.level.theme === 'clothes') { this.wardrobe.celebrate(); return; }
    if (this.adventure.level.theme === 'animals') { this.animals.celebrate(); return; }
    if (this.adventure.level.theme === 'welcome') { this.welcome.celebrate(); return; }
    if (this.adventure.level.theme === 'community') { this.community.celebrate(); return; }
    if (this.adventure.level.theme === 'body' && this.rabbit) { this.rabbit.hold('clap'); this.buddy.setVisible(true).perform('cheer'); }
    if (this.adventure.level.theme === 'family') this.makePhoto();
    this.hearts(850, 280, 5);
  }
}
