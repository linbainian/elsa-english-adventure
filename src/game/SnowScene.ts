import Phaser from 'phaser';
import { Adventure } from './Adventure';
import { AnimatedActor } from './AnimatedActor';
import { ThemeDirector, THEME_BACKGROUNDS } from './ThemeDirector';
import { elsaLookFor, elsaLookId, preloadElsaLooks } from './ElsaLooks';
import type { Step, World } from './level';

const LILAC = 0xc8acff;
const ICE = 0xc6f2ff;
const GOLD = 0xffdd80;
const PRINCESS_POSES = ['idle', 'cast', 'cheer'];
const STAGE_NAMES: Partial<Record<World, string>> = {
  meet: '和雪宝打招呼', orchard: '雪地里的小野餐', gate: '打开冰雪城堡',
  bridge: '滑过亮晶晶的冰桥', training: '一起变魔法', boss: '给伙伴一个惊喜', cleared: '欢迎来到雪花派对',
};

export class SnowScene extends Phaser.Scene {
  readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  isTransitioning = false;
  private adventure: Adventure;
  private hero!: AnimatedActor;
  private buddy!: AnimatedActor;
  private theme!: ThemeDirector;
  private levelListener = () => this.reset();
  private background!: Phaser.GameObjects.Image;
  private world: World | 'intro' = 'intro';
  private selectedStep = '';
  private started = false;
  private heroLook = 'ice';
  private heroTrace = '';
  private jumping = false;
  private moving = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private effects = new Set<Phaser.GameObjects.GameObject>();
  private choices: Phaser.GameObjects.Container[] = [];
  private choiceIds = '';
  private selection = 0;
  private basketCount = 0;
  private gateClosed: Phaser.GameObjects.Image | null = null;
  private gateOpen: Phaser.GameObjects.Image | null = null;
  private lantern: Phaser.GameObjects.Image | null = null;
  private guardian: AnimatedActor | null = null;
  private owl: AnimatedActor | null = null;
  private friendBubble: Phaser.GameObjects.Container | null = null;
  private focusRing: Phaser.GameObjects.Ellipse | null = null;
  private curtain: Phaser.GameObjects.Container | null = null;
  private transitionPromise = Promise.resolve();
  private resolveTransition: (() => void) | null = null;
  private responsePromise = Promise.resolve();
  private resolveResponse: (() => void) | null = null;
  private responseTimer: Phaser.Time.TimerEvent | null = null;
  private snow: { dot: Phaser.GameObjects.Arc; speed: number; phase: number }[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private viewListener = () => this.refresh();
  private resetListener = () => this.reset();
  private successListener = (event: Event) => this.respond((event as CustomEvent<{ step: Step }>).detail.step);

  constructor(adventure: Adventure) { super('snow-adventure'); this.adventure = adventure; }
  get isActing() { return this.jumping || this.moving; }
  whenReady() { return this.transitionPromise; }
  whenResponseReady() { return this.responsePromise; }

  preload() {
    ThemeDirector.preload(this);
    preloadElsaLooks(this);
    ['glade', 'orchard', 'palace'].forEach(key => this.load.image('snow-' + key, '/assets/snow/' + key + '.webp'));
    PRINCESS_POSES.forEach(pose => this.load.image('princess-' + pose, '/assets/snow/princess-' + pose + '.png'));
    ['buddy-idle', 'buddy-wave', 'troll', 'owl', 'gate-closed', 'gate-open', 'basket', 'lantern', 'bridge', 'globe'].forEach(key =>
      this.load.image('snow-' + key, '/assets/snow/' + key + '.png'));
    ['apple', 'banana', 'pear'].forEach(key => this.load.image(key, '/assets/snow/' + key + '.png'));
  }

  create() {
    this.started = true;
    this.background = this.add.image(640, 360, 'snow-glade').setDisplaySize(1280, 720).setDepth(0);
    this.hero = new AnimatedActor(this, 750, 575, 405, elsaLookFor(this.adventure.steps[0]!.world).textures, this.reducedMotion, true);
    this.buddy = new AnimatedActor(this, 1020, 575, 260, { idle: 'snow-buddy-idle', wave: 'snow-buddy-wave', cheer: 'snow-buddy-wave', listen: 'snow-buddy-wave' }, this.reducedMotion);
    this.theme = new ThemeDirector(this, this.adventure, this.hero, this.buddy, this.reducedMotion);
    for (let i = 0; i < (this.reducedMotion ? 12 : 38); i++) {
      const dot = this.add.circle(Math.random() * 1280, Math.random() * 720, 1.5 + Math.random() * 2.5, 0xffffff, .25 + Math.random() * .45).setDepth(i % 3 ? 2 : 20);
      this.snow.push({ dot, speed: 11 + Math.random() * 19, phase: Math.random() * 6 });
    }
    this.hero.perform('wave');
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.aKey = this.input.keyboard?.addKey('A');
    this.dKey = this.input.keyboard?.addKey('D');
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => { if (!this.inputBlocked(event)) { event.preventDefault(); this.jump(); } });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (!this.inputBlocked(event) && !(event.target as HTMLElement)?.closest('button') && this.adventure.step.kind === 'choose')
        this.adventure.choose(this.adventure.step.choices?.[this.selection]?.id ?? '');
    });
    this.input.keyboard?.on('keydown-LEFT', (event: KeyboardEvent) => { if (!this.inputBlocked(event) && this.adventure.step.kind === 'choose') this.select(this.selection - 1); });
    this.input.keyboard?.on('keydown-RIGHT', (event: KeyboardEvent) => { if (!this.inputBlocked(event) && this.adventure.step.kind === 'choose') this.select(this.selection + 1); });
    this.adventure.addEventListener('change', this.viewListener);
    this.adventure.addEventListener('restart', this.resetListener);
    this.adventure.addEventListener('level', this.levelListener);
    this.adventure.addEventListener('success', this.successListener);
    this.events.once('shutdown', () => {
      this.cancelTransition();
      this.finishResponse();
      this.adventure.removeEventListener('change', this.viewListener);
      this.adventure.removeEventListener('restart', this.resetListener);
      this.adventure.removeEventListener('level', this.levelListener);
      this.theme.clear();
      this.adventure.removeEventListener('success', this.successListener);
      this.started = false;
    });
    this.adventure.dispatchEvent(new CustomEvent('scene-ready'));
  }

  listening(active: boolean) {
    if (!this.started || this.isTransitioning || this.isActing || this.adventure.state.phase !== 'playing') return;
    this.hero.hold(active ? 'listen' : 'idle');
    this.buddy.hold(active ? 'listen' : 'idle');
  }

  private inputBlocked(event?: KeyboardEvent) {
    return this.isTransitioning || this.adventure.state.paused || this.adventure.state.phase !== 'playing'
      || Boolean((event?.target as HTMLElement)?.closest('input, textarea, select, dialog'))
      || Boolean(event && this.adventure.state.mode === 'voice');
  }

  private own<T extends Phaser.GameObjects.GameObject>(object: T): T { this.objects.push(object); return object; }
  private transient<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.effects.add(object);
    object.once('destroy', () => this.effects.delete(object));
    return object;
  }

  private remove(object: Phaser.GameObjects.GameObject) {
    this.tweens.killTweensOf(object);
    if (object instanceof Phaser.GameObjects.Container) object.list.forEach(child => this.tweens.killTweensOf(child));
    object.destroy();
  }

  private clearWorld() {
    this.theme?.clear();
    this.clearFocus();
    this.objects.forEach(object => this.remove(object));
    this.effects.forEach(object => this.remove(object));
    this.objects = [];
    this.choices = [];
    this.choiceIds = '';
    this.gateClosed = this.gateOpen = this.lantern = null;
    this.guardian = this.owl = null;
    this.friendBubble = null;
    this.basketCount = 0;
    this.selection = 0;
  }

  private dressFor(world: World) {
    const look = elsaLookFor(world);
    this.heroLook = world.startsWith('wardrobe-') ? 'wardrobe' : elsaLookId(world);
    this.hero.setRigProfile(look.rig);
    this.hero.setTextures(look.textures);
    this.hero.faceLeft(false);
  }

  private publishHeroLook() {
    const trace = `${this.heroLook}:${this.hero.art.texture.key}:${this.hero.art.frame.width}`;
    if (trace === this.heroTrace) return;
    this.heroTrace = trace;
    this.adventure.dispatchEvent(new CustomEvent('elsa-look-state', { detail: {
      look: this.heroLook, texture: this.hero.art.texture.key, frameWidth: this.hero.art.frame.width,
    } }));
  }

  private reset() {
    this.cancelTransition();
    this.finishResponse();
    this.clearWorld();
    this.world = 'intro';
    this.selectedStep = '';
    this.jumping = this.moving = false;
    this.tweens.killTweensOf(this.hero);
    this.tweens.killTweensOf(this.buddy);
    this.hero.setPosition(750, 575).setScale(1).setAngle(0).setVisible(true);
    this.buddy.setPosition(1020, 575).setScale(1).setAngle(0).setVisible(true);
    this.dressFor(this.adventure.steps[0]!.world);
    this.hero.perform('wave');
    this.buddy.idle();
    const path = THEME_BACKGROUNDS[this.adventure.steps[0]!.world];
    this.background.setTexture(path ? 'theme-' + path : 'snow-glade').setTint(0xffffff);
    this.snow.forEach(({ dot }) => dot.setVisible(!this.adventure.level.theme));
    if (['clothes', 'animals', 'welcome', 'community'].includes(this.adventure.level.theme ?? '')) {
      this.theme.build(this.adventure.steps[0]!.world);
    } else if (this.adventure.level.theme) {
      this.buddy.setVisible(false);
      this.own(this.add.image(1040, 576, 'theme-body/rabbit-idle').setOrigin(.5, 1).setDisplaySize(285, 285).setDepth(6));
    }
  }

  private refresh() {
    if (!this.started || this.adventure.state.phase === 'intro') return;
    const nextWorld = this.adventure.state.phase === 'complete' && !this.adventure.level.theme ? 'cleared' : this.adventure.step.world;
    if (this.world !== nextWorld) { this.changeWorld(nextWorld); return; }
    if (!this.isTransitioning) this.showStep();
    if (this.adventure.state.phase === 'complete') this.party();
  }

  private cancelTransition() {
    if (this.curtain) { this.remove(this.curtain); this.curtain = null; }
    this.isTransitioning = false;
    this.resolveTransition?.();
    this.resolveTransition = null;
  }

  private changeWorld(next: World) {
    this.cancelTransition();
    this.isTransitioning = true;
    this.world = next;
    this.transitionPromise = new Promise(resolve => { this.resolveTransition = resolve; });
    const veil = this.add.rectangle(640, 360, 1280, 720, 0xeef0ff, 1);
    const flakes: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < 12; i++) flakes.push(this.add.star(80 + i * 112, 170 + (i % 3) * 180, 6, 9, 25 + i % 4 * 5, 0xffffff, .6));
    const curtain = this.add.container(0, 0, [veil, ...flakes]).setAlpha(0).setDepth(100);
    this.curtain = curtain;
    this.adventure.dispatchEvent(new CustomEvent('world-travel', { detail: { title: this.adventure.level.acts.find(act => act.world === next)?.title ?? STAGE_NAMES[next], world: next } }));
    this.hero.hold('glide');
    this.tweens.add({ targets: curtain, alpha: 1, duration: this.reducedMotion ? 100 : 380, ease: 'Sine.InOut', onComplete: () => {
      if (this.curtain !== curtain) return;
      this.buildWorld(next);
      this.showStep();
      this.tweens.add({ targets: curtain, alpha: 0, duration: this.reducedMotion ? 150 : 720, ease: 'Sine.InOut', onComplete: () => {
        if (this.curtain !== curtain) return;
        this.remove(curtain);
        this.curtain = null;
        this.isTransitioning = false;
        this.hero.perform('wave');
        this.buddy.perform('wave');
        this.resolveTransition?.();
        this.resolveTransition = null;
        this.adventure.dispatchEvent(new CustomEvent('world-ready'));
      } });
    } });
  }

  private buildWorld(world: World) {
    this.clearWorld();
    this.selectedStep = '';
    this.tweens.killTweensOf(this.hero);
    this.tweens.killTweensOf(this.buddy);
    this.hero.setPosition(world === 'orchard' ? 250 : 300, 567).setScale(1).setAngle(0).setVisible(true);
    this.buddy.setPosition(world === 'orchard' ? 1110 : 595, 564).setScale(1).setAngle(0).setVisible(world !== 'boss');
    this.dressFor(world);
    this.hero.idle();
    this.buddy.idle();
    const themePath = THEME_BACKGROUNDS[world];
    if (themePath) {
      this.background.setTexture('theme-' + themePath).setTint(0xffffff);
      this.snow.forEach(({ dot }) => dot.setVisible(world === 'body-stage'));
      this.theme.build(world);
      return;
    }
    this.snow.forEach(({ dot }) => dot.setVisible(true));
    this.background.setTexture(world === 'orchard' ? 'snow-orchard' : ['gate', 'training', 'boss', 'cleared'].includes(world) ? 'snow-palace' : 'snow-glade').setTint(0xffffff);
    if (world === 'orchard') this.own(this.add.image(415, 590, 'snow-basket').setOrigin(.5, 1).setDisplaySize(200, 200).setDepth(8));
    if (world === 'gate') {
      this.gateOpen = this.own(this.add.image(925, 579, 'snow-gate-open').setOrigin(.5, 1).setDisplaySize(390, 390).setDepth(4).setAlpha(0));
      this.gateClosed = this.own(this.add.image(925, 579, 'snow-gate-closed').setOrigin(.5, 1).setDisplaySize(390, 390).setDepth(5));
    }
    if (world === 'bridge') {
      this.own(this.add.ellipse(820, 572, 740, 135, 0xa9d7ee, .28).setDepth(1));
      this.own(this.add.image(815, 610, 'snow-bridge').setOrigin(.5, 1).setDisplaySize(650, 650).setDepth(3));
      this.buddy.setPosition(1100, 559);
      this.own(this.add.circle(497, 555, 28, 0xf8fbff).setStrokeStyle(3, 0xd6e6f9).setDepth(4));
    }
    if (world === 'training') {
      this.lantern = this.own(this.add.image(970, 555, 'snow-lantern').setOrigin(.5, 1).setDisplaySize(330, 330).setDepth(4));
      this.own(this.add.image(1130, 540, 'snow-globe').setOrigin(.5, 1).setDisplaySize(180, 180).setDepth(3));
    }
    if (world === 'boss' || world === 'cleared') {
      this.guardian = this.own(new AnimatedActor(this, 965, 567, 315, { idle: 'snow-troll', cheer: 'snow-troll' }, this.reducedMotion));
      this.owl = this.own(new AnimatedActor(this, world === 'cleared' ? 740 : 1115, world === 'cleared' ? 545 : 350, world === 'cleared' ? 170 : 135, { idle: 'snow-owl' }, this.reducedMotion));
      if (world === 'boss') {
        const bubble = this.add.ellipse(0, 0, 175, 170, 0xc7e9ff, .24).setStrokeStyle(4, 0xffffff, .8);
        const shine = this.add.arc(-43, -33, 43, 195, 275, false, 0xffffff, 0).setStrokeStyle(7, 0xffffff, .7);
        this.friendBubble = this.own(this.add.container(1115, 285, [bubble, shine]).setDepth(10));
        this.drawProgress();
      } else {
        this.buddy.setVisible(true).setPosition(535, 554);
        this.party();
      }
    }
  }

  private showStep() {
    const step = this.adventure.step;
    if (this.selectedStep === step.id) return;
    this.selectedStep = step.id;
    if (step.moment) { this.theme.showStep(step); return; }
    if (step.kind === 'choose') this.makeChoices(step);
    else if (this.choices.length) {
      this.choices.forEach(choice => { this.objects = this.objects.filter(obj => obj !== choice); this.remove(choice); });
      this.choices = [];
      this.choiceIds = '';
    }
    if (step.world === 'boss') this.drawProgress();
    if (this.adventure.state.phase === 'playing') this.focusStep(step);
  }

  private clearFocus() { if (this.focusRing) { this.remove(this.focusRing); this.focusRing = null; } }
  private focusStep(step: Step) {
    this.clearFocus();
    const choice = this.choices.find((_, i) => step.choices?.[i]?.id === step.answer);
    const x = choice?.x ?? (step.effect === 'door' ? 925 : this.hero.x);
    this.focusRing = this.add.ellipse(x, choice ? choice.y + 40 : 568, choice ? 175 : 170, 48, 0xe7d7ff, .3).setStrokeStyle(3, 0xffffff, .85).setDepth(4);
    if (choice && this.adventure.state.mode === 'voice') this.select(this.choices.indexOf(choice));
    if (!this.reducedMotion) this.tweens.add({ targets: this.focusRing, alpha: .65, scale: 1.08, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private makeChoices(step: Step) {
    const ids = step.choices?.map(choice => choice.id).join(',') ?? '';
    if (ids === this.choiceIds && this.choices.length) return;
    this.choices.forEach(choice => { this.objects = this.objects.filter(obj => obj !== choice); this.remove(choice); });
    this.choices = [];
    this.choiceIds = ids;
    step.choices?.forEach((choice, i) => {
      const x = (step.world === 'boss' ? 565 : 635) + i * 180;
      const y = step.world === 'boss' ? 410 : 415;
      const halo = this.add.ellipse(0, 40, 145, 45, 0xd7c4f7, .3).setStrokeStyle(2, 0xffffff, .8);
      const parts: Phaser.GameObjects.GameObject[] = [halo];
      if (choice.asset) parts.push(this.add.image(0, -10, choice.asset).setDisplaySize(140, 140));
      else {
        const color = parseInt(choice.color!.slice(1), 16);
        const gem = this.add.graphics().fillStyle(color, 1).lineStyle(4, 0xffffff, .85);
        const points = [[0, -83], [33, -39], [21, 12], [0, 25], [-21, 12], [-33, -39]].map(([px, py]) => new Phaser.Math.Vector2(px!, py!));
        gem.fillPoints(points, true).strokePoints(points, true).lineStyle(3, 0xffffff, .7).lineBetween(0, -83, -8, -32).lineBetween(-8, -32, 0, 25);
        parts.push(gem);
      }
      const text = this.adventure.state.mode === 'voice' ? choice.id[0]!.toUpperCase() + choice.id.slice(1) : String(i + 1);
      parts.push(this.add.text(0, 83, text, { fontFamily: 'Trebuchet MS', fontStyle: 'bold', fontSize: '23px', color: '#666094', backgroundColor: '#fff9fc', padding: { x: 15, y: 6 } }).setOrigin(.5));
      const hit = this.add.rectangle(0, 0, 165, 175, 0xffffff, .001);
      if (this.adventure.state.mode !== 'voice') hit.setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.select(i));
      hit.on('pointerdown', () => { if (!this.inputBlocked() && this.adventure.state.mode !== 'voice') this.adventure.choose(choice.id); });
      parts.push(hit);
      const group = this.own(this.add.container(x, y + 24, parts).setDepth(8).setAlpha(0));
      this.choices.push(group);
      this.tweens.add({ targets: group, y, alpha: 1, duration: this.reducedMotion ? 80 : 450, delay: this.reducedMotion ? 0 : i * 90, ease: 'Back.Out' });
      if (!this.reducedMotion) this.tweens.add({ targets: parts[1], y: -16, duration: 1300 + i * 180, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 450 });
    });
    if (this.adventure.state.mode !== 'voice') this.select(0);
  }

  select(index: number) {
    if (!this.choices.length) return;
    this.selection = (index + this.choices.length) % this.choices.length;
    this.choices.forEach((choice, i) => (choice.getAt(0) as Phaser.GameObjects.Ellipse).setFillStyle(i === this.selection ? GOLD : LILAC, i === this.selection ? .65 : .22));
  }

  private drawProgress() {
    const old = this.objects.find(object => object.name === 'magic-progress');
    if (old) { this.objects = this.objects.filter(object => object !== old); this.remove(old); }
    const bossIds = this.adventure.level.steps.filter(step => step.world === 'boss').map(step => step.id);
    const complete = bossIds.filter(id => this.adventure.state.completed.includes(id)).length;
    const stars: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < bossIds.length; i++) stars.push(this.add.star(i * 38, 0, 5, 7, 14, i < complete ? GOLD : 0xe0d6f3).setStrokeStyle(2, 0xffffff));
    this.own(this.add.container(910, 210, stars).setName('magic-progress').setDepth(12));
  }

  jump() {
    if (this.inputBlocked() || this.isActing) return;
    this.jumping = true;
    const y = this.hero.y;
    this.hero.hold('charge');
    this.tweens.add({ targets: this.hero, scaleX: 1.06, scaleY: .94, duration: 140, ease: 'Sine.InOut', onComplete: () => {
      this.hero.hold('glide');
      this.tweens.add({ targets: this.hero, y: y - (this.reducedMotion ? 25 : 120), scaleX: .98, scaleY: 1.025, duration: 290, ease: 'Quad.Out', onComplete: () => {
        this.tweens.add({ targets: this.hero, y, scaleX: 1.035, scaleY: .97, duration: 320, ease: 'Quad.In', onComplete: () => {
          this.sprinkle(this.hero.x, y - 12, ICE, 14);
          this.tweens.add({ targets: this.hero, scaleX: 1, scaleY: 1, duration: 170, ease: 'Back.Out', onComplete: () => {
            this.jumping = false;
            this.hero.idle();
            this.adventure.action('jump');
          } });
        } });
      } });
    } });
  }

  walkRight() {
    if (this.inputBlocked() || this.isActing) return;
    this.moving = true;
    this.hero.faceLeft(false);
    this.hero.hold('glide');
    const startY = this.hero.y;
    let lastTrail = 0;
    this.tweens.add({ targets: this.hero, x: 1010, duration: this.reducedMotion ? 500 : 1900, ease: 'Sine.InOut', onUpdate: tween => {
      this.hero.y = startY - Math.sin(tween.progress * Math.PI) * (this.reducedMotion ? 0 : 95);
      if (!this.reducedMotion && this.time.now - lastTrail > 120) { lastTrail = this.time.now; this.sprinkle(this.hero.x - 65, startY - 10, ICE, 2); }
    }, onComplete: () => {
      this.hero.y = startY;
      this.moving = false;
      this.hero.idle();
      this.adventure.action('right');
    } });
  }

  private finishResponse() {
    this.responseTimer?.remove();
    this.responseTimer = null;
    this.resolveResponse?.();
    this.resolveResponse = null;
  }

  private respond(step: Step) {
    this.finishResponse();
    this.clearFocus();
    this.responsePromise = new Promise(resolve => { this.resolveResponse = resolve; });
    const spell = ['fire', 'ice', 'shield'].includes(step.effect);
    const themeLength = step.moment ? this.theme.respond(step) : null;
    const length = themeLength ?? (spell || step.effect === 'door' ? 1550 : step.kind === 'choose' ? 1450 : 1000);
    this.responseTimer = this.time.delayedCall(themeLength ? length : this.reducedMotion ? 500 : length, () => {
      this.hero.perform('cheer');
      this.buddy.perform('cheer');
      this.sprinkle(this.hero.x + 20, this.hero.y - 180, GOLD, 10);
      this.adventure.dispatchEvent(new CustomEvent('world-response', { detail: { effect: step.effect } }));
      this.finishResponse();
    });
    if (step.moment) { if (this.adventure.level.starStepIds.includes(step.id)) this.snowflakeGift(); return; }
    if (spell) this.hero.perform('cast', () => this.cast(step.effect as 'fire' | 'ice' | 'shield'));
    else if (step.effect === 'door') this.hero.perform('cast', () => {
      const hand = this.handPoint();
      this.sprinkle(hand.x, hand.y, ICE, 12);
      this.sprinkle(925, 390, ICE, 26);
      if (this.gateClosed) this.tweens.add({ targets: this.gateClosed, alpha: 0, duration: 850, ease: 'Sine.InOut' });
      if (this.gateOpen) this.tweens.add({ targets: this.gateOpen, alpha: 1, duration: 850, ease: 'Sine.InOut' });
    });
    else if (step.kind === 'choose') this.collectChoice(step);
    else this.hero.perform('wave');
    if (step.world === 'boss') this.drawProgress();
    if (this.adventure.level.starStepIds.includes(step.id)) this.snowflakeGift();
    if (step.effect === 'rescue') this.party();
  }

  private collectChoice(step: Step) {
    const choice = this.choices.find((_, i) => step.choices?.[i]?.id === step.answer);
    if (!choice) return;
    this.hero.perform('cast', () => {
      const hand = this.handPoint();
      this.sprinkle(hand.x, hand.y, GOLD, 9);
      const x = choice.x, y = choice.y;
      const endX = step.effect === 'fruit' ? 415 : x;
      const endY = step.effect === 'fruit' ? 477 : y - 75;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2((x + endX) / 2, y - 145), new Phaser.Math.Vector2(endX, endY));
      const flight = { t: 0 };
      const trail = this.transient(this.add.star(x, y, 6, 5, 12, GOLD, .8).setDepth(11));
      this.tweens.add({ targets: flight, t: 1, duration: this.reducedMotion ? 300 : 850, ease: 'Sine.InOut', onUpdate: () => {
        if (!choice.active) return;
        const p = curve.getPoint(flight.t);
        choice.setPosition(p.x, p.y).setScale(1 - flight.t * .48).setAngle(Math.sin(flight.t * Math.PI) * -14);
        trail.setPosition(p.x + 22, p.y + 12).setRotation(flight.t * 4);
      }, onComplete: () => {
        trail.destroy();
        if (!choice.active) return;
        choice.setAlpha(0);
        this.sprinkle(endX, endY, step.effect === 'fruit' ? GOLD : ICE, 18);
        if (step.effect === 'fruit') {
          const asset = step.choices?.find(item => item.id === step.answer)?.asset;
          if (asset) this.own(this.add.image(390 + this.basketCount++ * 25, 475, asset).setDisplaySize(48, 48).setDepth(9));
        }
      } });
    });
  }

  private handPoint() { return new Phaser.Math.Vector2(this.hero.x + 100 * this.hero.scaleX, this.hero.y - 300 * this.hero.scaleY); }

  private cast(spell: 'fire' | 'ice' | 'shield') {
    const start = this.handPoint();
    const color = spell === 'fire' ? 0xffc37f : spell === 'ice' ? ICE : LILAC;
    this.sprinkle(start.x, start.y, color, 10);
    if (spell === 'shield') {
      const bubble = this.transient(this.add.ellipse(this.hero.x, this.hero.y - 210, 330, 440, 0xbcd9ff, .2).setStrokeStyle(4, 0xffffff, .85).setDepth(10).setScale(.25));
      this.tweens.add({ targets: bubble, scale: 1.03, duration: 500, ease: 'Back.Out', onComplete: () => {
        this.tweens.add({ targets: bubble, alpha: 0, scale: 1.1, duration: 850, ease: 'Sine.InOut', onComplete: () => bubble.destroy() });
      } });
      if (this.world === 'boss' && this.owl) {
        if (this.friendBubble) this.tweens.add({ targets: this.friendBubble, scale: 1.2, alpha: 0, duration: 450 });
        const owl = this.owl;
        const flight = { t: 0 };
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(owl.x, owl.y), new Phaser.Math.Vector2(930, 150), new Phaser.Math.Vector2(730, 535));
        this.tweens.add({ targets: flight, t: 1, duration: 1050, ease: 'Sine.InOut', onUpdate: () => {
          if (!owl.active) return;
          const p = curve.getPoint(flight.t);
          owl.setPosition(p.x, p.y).setAngle(Math.sin(flight.t * Math.PI * 3) * 7);
        }, onComplete: () => { if (owl.active) owl.setAngle(0); } });
      }
      return;
    }
    const core = this.add.star(0, 0, spell === 'ice' ? 6 : 5, 10, 25, spell === 'ice' ? 0xffffff : GOLD, 1);
    const glow = this.add.circle(0, 0, 34, color, .28);
    const projectile = this.transient(this.add.container(start.x, start.y, [glow, core]).setDepth(15));
    const end = new Phaser.Math.Vector2(970, this.world === 'boss' ? 395 : 405);
    const curve = new Phaser.Curves.QuadraticBezier(start, new Phaser.Math.Vector2((start.x + end.x) / 2, start.y - 100), end);
    const flight = { t: 0 };
    let lastTrail = 0;
    this.tweens.add({ targets: flight, t: 1, duration: this.reducedMotion ? 250 : 760, ease: 'Cubic.InOut', onUpdate: () => {
      if (!projectile.active) return;
      const p = curve.getPoint(flight.t);
      projectile.setPosition(p.x, p.y).setRotation(flight.t * 3);
      if (!this.reducedMotion && this.time.now - lastTrail > 65) { lastTrail = this.time.now; this.sprinkle(p.x - 15, p.y, color, 1); }
    }, onComplete: () => {
      projectile.destroy();
      this.sprinkle(end.x, end.y, color, 25);
      if (this.lantern?.active) this.lantern.setTint(spell === 'fire' ? 0xffe2bc : 0xc4f1ff);
      if (this.guardian?.active) this.guardian.perform('cheer');
      if (this.friendBubble?.active) this.tweens.add({ targets: this.friendBubble, alpha: spell === 'ice' ? .4 : .7, duration: 500 });
    } });
  }

  private sprinkle(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < (this.reducedMotion ? Math.min(3, count) : count); i++) {
      const particle = this.transient(this.add.star(x, y, i % 3 ? 5 : 6, 2, 4 + Math.random() * 5, color, .9).setDepth(18));
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 80;
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - 22, scale: .25, alpha: 0, rotation: 1.2, duration: 800 + Math.random() * 450, ease: 'Sine.Out', onComplete: () => particle.destroy() });
    }
  }

  private snowflakeGift() {
    const gift = this.transient(this.add.star(690, 255, 6, 17, 38, GOLD).setStrokeStyle(4, 0xffffff).setDepth(20).setScale(.2));
    this.tweens.add({ targets: gift, scale: 1, angle: 35, duration: 600, ease: 'Back.Out', onComplete: () => {
      this.tweens.add({ targets: gift, x: 1190, y: 50, scale: .3, alpha: 0, duration: 950, ease: 'Sine.InOut', onComplete: () => gift.destroy() });
    } });
  }

  private party() {
    if (this.adventure.level.theme) { this.theme.celebrate(); this.hero.perform('cheer'); return; }
    this.sprinkle(640, 240, GOLD, 28);
    this.sprinkle(870, 300, LILAC, 18);
    if (this.guardian?.active) this.guardian.perform('cheer');
    this.buddy.perform('cheer');
    this.hero.perform('cheer');
  }

  update(time: number, delta: number) {
    if (!this.started) return;
    this.hero.animate(time);
    this.publishHeroLook();
    this.theme.update();
    if (!this.reducedMotion) this.snow.forEach(({ dot, speed, phase }) => {
      dot.y += speed * Math.min(delta, 50) / 1000;
      dot.x += Math.sin(time / 2600 + phase) * Math.min(delta, 50) * .007;
      if (dot.y > 730) dot.setPosition(Math.random() * 1280, -10);
    });
    if (this.inputBlocked() || this.isActing || this.adventure.state.mode === 'voice' || this.adventure.step.kind === 'choose') return;
    if (this.cursors?.right.isDown || this.dKey?.isDown) {
      this.hero.faceLeft(false);
      if (this.adventure.step.action === 'right') this.walkRight();
      else this.hero.x = Math.min(1110, this.hero.x + delta * .25);
    } else if (this.cursors?.left.isDown || this.aKey?.isDown) { this.hero.faceLeft(true); this.hero.x = Math.max(160, this.hero.x - delta * .25); }
  }
}
