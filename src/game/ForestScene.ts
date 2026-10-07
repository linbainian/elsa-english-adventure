import Phaser from 'phaser';
import { Adventure } from './Adventure';
import type { Step, World } from './level';

const GOLD = 0xffdb87;
const GREEN = 0x174e42;

export class ForestScene extends Phaser.Scene {
  private adventure: Adventure;
  private hero!: Phaser.GameObjects.Container;
  private fox!: Phaser.GameObjects.Container;
  private heroArt!: Phaser.GameObjects.Image;
  private background!: Phaser.GameObjects.Image;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private choices: Phaser.GameObjects.Container[] = [];
  private gatePanel: Phaser.GameObjects.Container | null = null;
  private guardian: Phaser.GameObjects.Container | null = null;
  private owl: Phaser.GameObjects.Container | null = null;
  private selection = 0;
  private world: World | 'intro' = 'intro';
  private selectedStep = '';
  private jumping = false;
  private moving = false;
  private started = false;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private ambient: Phaser.GameObjects.Ellipse[] = [];
  private stars: Phaser.GameObjects.Container[] = [];
  private focusRing: Phaser.GameObjects.Ellipse | null = null;
  private viewListener = () => this.refresh();
  private successListener = (event: Event) => {
    const detail = (event as CustomEvent<{ step: Step; source: string }>).detail;
    this.effect(detail.step, detail.source);
  };

  constructor(adventure: Adventure) {
    super('forest');
    this.adventure = adventure;
  }

  preload() {
    this.load.image('forest', '/assets/forest.webp');
    ['hero', 'fox', 'guardian', 'owl'].forEach(key => this.load.image(key, `/assets/${key}.png`));
    ['apple', 'banana', 'pear'].forEach(key => this.load.svg(key, `/assets/${key}.svg`, { width: 170, height: 170 }));
  }

  create() {
    this.world = 'intro';
    this.selectedStep = '';
    this.worldObjects = [];
    this.choices = [];
    this.ambient = [];
    this.stars = [];
    this.started = true;
    this.background = this.add.image(640, 360, 'forest').setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, GREEN, .055);
    for (let i = 0; i < 22; i++) {
      const point = this.add.ellipse(Phaser.Math.Between(50, 1230), Phaser.Math.Between(80, 580), 3 + Math.random() * 4, 3 + Math.random() * 4, GOLD, .35);
      this.ambient.push(point);
      if (!this.reducedMotion) this.tweens.add({ targets: point, y: point.y - 30, x: point.x + 12, alpha: .04, duration: 2200 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 110 });
    }
    this.hero = this.character('hero', 785, 593, 300);
    this.heroArt = this.hero.getAt(1) as Phaser.GameObjects.Image;
    this.fox = this.character('fox', 1040, 590, 238);
    this.makeHiddenStars();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.aKey = this.input.keyboard?.addKey('A');
    this.dKey = this.input.keyboard?.addKey('D');
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (this.inputBlocked(event)) return;
      event.preventDefault();
      this.jump();
    });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (this.inputBlocked(event) || (event.target as HTMLElement)?.closest('button')) return;
      if (this.adventure.step.kind === 'choose') this.adventure.choose(this.adventure.step.choices?.[this.selection]?.id ?? '');
    });
    this.input.keyboard?.on('keydown-LEFT', (event: KeyboardEvent) => {
      if (!this.inputBlocked(event) && this.adventure.step.kind === 'choose') this.select(this.selection - 1);
    });
    this.input.keyboard?.on('keydown-RIGHT', (event: KeyboardEvent) => {
      if (!this.inputBlocked(event) && this.adventure.step.kind === 'choose') this.select(this.selection + 1);
    });
    this.adventure.addEventListener('change', this.viewListener);
    this.adventure.addEventListener('success', this.successListener);
    this.adventure.addEventListener('restart', this.resetListener);
    this.events.once('shutdown', () => {
      this.adventure.removeEventListener('change', this.viewListener);
      this.adventure.removeEventListener('success', this.successListener);
      this.adventure.removeEventListener('restart', this.resetListener);
      this.started = false;
    });
    this.refresh();
    this.adventure.dispatchEvent(new CustomEvent('scene-ready'));
  }

  private resetListener = () => {
    this.selectedStep = '';
    this.world = 'intro';
    this.stars.forEach(star => star.setVisible(true));
    this.tweens.killTweensOf(this.hero);
    this.tweens.killTweensOf(this.fox);
    this.hero.setPosition(785, 593);
    this.fox.setPosition(1040, 590);
    this.jumping = false;
    this.moving = false;
    this.clearWorld();
  };

  private inputBlocked(event?: KeyboardEvent) {
    const active = event?.target as HTMLElement | undefined;
    return this.adventure.state.paused || this.adventure.state.phase !== 'playing' || Boolean(active?.closest('input, textarea, select, dialog')) || Boolean(event && this.adventure.state.mode === 'voice');
  }

  private character(texture: string, x: number, y: number, size: number) {
    const shadow = this.add.ellipse(0, -2, size * .55, size * .095, GREEN, .18);
    const image = this.add.image(0, 0, texture).setOrigin(.5, 1).setDisplaySize(size, size);
    const group = this.add.container(x, y, [shadow, image]).setDepth(5);
    if (!this.reducedMotion) this.tweens.add({ targets: image, y: -5, duration: 1100 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return group;
  }

  private makeHiddenStars() {
    const positions = [[112, 465], [1140, 455], [900, 165]];
    positions.forEach(([x, y], index) => {
      const glow = this.add.circle(0, 0, 24, GOLD, .16);
      const symbol = this.add.star(0, 0, 4, 5, 15, GOLD).setStrokeStyle(2, 0xfff5d2);
      const star = this.add.container(x!, y!, [glow, symbol]).setDepth(10);
      this.stars.push(star);
      if (!this.reducedMotion) this.tweens.add({ targets: star, y: y! - 8, duration: 1500 + index * 210, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
    });
  }

  private clearWorld() {
    this.clearFocus();
    for (const object of this.worldObjects) {
      this.tweens.killTweensOf(object);
      if (object instanceof Phaser.GameObjects.Container) object.list.forEach(child => this.tweens.killTweensOf(child));
      object.destroy();
    }
    this.worldObjects = [];
    this.choices = [];
    this.gatePanel = null;
    this.guardian = null;
    this.owl = null;
    this.selection = 0;
  }

  private own<T extends Phaser.GameObjects.GameObject>(object: T): T { this.worldObjects.push(object); return object; }

  private refresh() {
    if (!this.started) return;
    const state = this.adventure.state;
    const step = this.adventure.step;
    if (state.phase === 'intro') {
      this.ambient.forEach(point => point.setAlpha(.3));
      return;
    }
    const world = state.phase === 'complete' ? 'cleared' : step.world;
    const changed = this.world !== world;
    if (changed) {
      this.world = world;
      this.clearWorld();
      this.hero.setVisible(true);
      this.fox.setVisible(world !== 'boss' && world !== 'cleared');
      this.hero.setPosition(world === 'orchard' ? 210 : 335, 593);
      this.fox.setPosition(world === 'orchard' ? 440 : 670, 577);
      if (world === 'orchard') this.makeBasket();
      if (world === 'gate') this.makeGate();
      if (world === 'bridge') this.makeBridge();
      if (world === 'training') this.makeTraining();
      if (world === 'boss') this.makeBoss();
      if (world === 'cleared') this.makeCleared();
      this.background.setTint(world === 'boss' ? 0xc4ded4 : 0xffffff);
    }
    if (this.selectedStep !== step.id && state.phase !== 'complete') {
      this.selectedStep = step.id;
      if (step.kind === 'choose') this.makeChoices(step);
      else if (this.choices.length) {
        this.choices.forEach(choice => { this.worldObjects = this.worldObjects.filter(object => object !== choice); choice.destroy(); });
        this.choices = [];
      }
      if (world === 'boss' && this.guardian) this.drawBossProgress();
      if (state.phase === 'playing' && state.mode === 'voice') this.focusStep(step);
    }
  }

  private clearFocus() {
    if (!this.focusRing) return;
    this.tweens.killTweensOf(this.focusRing);
    this.focusRing.destroy();
    this.focusRing = null;
  }

  private focusStep(step: Step) {
    this.clearFocus();
    const choice = this.choices.find((_, i) => step.choices?.[i]?.id === step.answer);
    const x = choice?.x ?? (step.effect === 'door' ? 920 : this.hero.x);
    const y = choice ? choice.y + 30 : step.effect === 'door' ? 577 : this.hero.y - 5;
    if (choice) this.select(this.choices.indexOf(choice));
    this.focusRing = this.add.ellipse(x, y, choice ? 162 : 165, 52, GOLD, .16).setStrokeStyle(3, 0xfff2b9, .9).setDepth(6);
    if (!this.reducedMotion) this.tweens.add({ targets: this.focusRing, scale: 1.1, alpha: .45, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private makeChoices(step: Step) {
    this.choices.forEach(choice => { this.worldObjects = this.worldObjects.filter(object => object !== choice); choice.destroy(); });
    this.choices = [];
    step.choices?.forEach((choice, index) => {
      const x = (step.world === 'boss' ? 565 : 665) + index * 190;
      const y = step.world === 'boss' ? 455 : 510;
      const halo = this.add.ellipse(0, 30, 140, 46, GOLD, .22).setStrokeStyle(2, 0xfff1b7, .65);
      const content: Phaser.GameObjects.GameObject[] = [halo];
      if (choice.asset) content.push(this.add.image(0, -22, choice.asset).setDisplaySize(110, 110));
      else {
        const color = Number.parseInt(choice.color!.slice(1), 16);
        const gem = this.add.graphics().fillStyle(color, .9).lineStyle(3, 0xfff6d9, .8);
        const points = [[0, -96], [35, -52], [22, 8], [0, 24], [-22, 8], [-35, -52]].map(([px, py]) => new Phaser.Math.Vector2(px!, py!));
        gem.fillPoints(points, true);
        gem.strokePoints(points, true);
        gem.lineStyle(2, 0xffffff, .55).lineBetween(0, -96, -10, -38).lineBetween(-10, -38, 0, 24);
        content.push(gem);
      }
      const labelText = this.adventure.state.mode === 'voice' ? choice.id.charAt(0).toUpperCase() + choice.id.slice(1) : String(index + 1);
      const label = this.add.text(0, 70, labelText, { fontFamily: 'Georgia', fontSize: '18px', color: '#fff8d9', backgroundColor: '#285748', padding: { x: 12, y: 5 } }).setOrigin(.5);
      const hit = this.add.rectangle(0, -5, 155, 170, 0xffffff, .001);
      if (this.adventure.state.mode !== 'voice') hit.setInteractive({ useHandCursor: true });
      content.push(label, hit);
      const group = this.own(this.add.container(x, y, content).setDepth(7));
      this.choices.push(group);
      hit.on('pointerover', () => this.select(index));
      hit.on('pointerdown', () => { if (this.adventure.state.mode !== 'voice' && !this.inputBlocked()) this.adventure.choose(choice.id); });
      if (!this.reducedMotion) this.tweens.add({ targets: content[1], y: -7, duration: 1000 + index * 200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    if (this.adventure.state.mode !== 'voice') this.select(0);
  }

  private makeBasket() {
    const basket = this.add.graphics();
    basket.lineStyle(7, 0x97724d).strokeEllipse(330, 521, 91, 70);
    basket.fillStyle(0xc6a26b).fillRoundedRect(279, 518, 103, 62, 10);
    basket.lineStyle(4, 0x9b774d).strokeRoundedRect(279, 518, 103, 62, 10);
    basket.lineStyle(2, 0xa07b4f, .7);
    for (let i = 0; i < 5; i++) basket.lineBetween(289 + i * 18, 525, 289 + i * 18, 577);
    for (let i = 0; i < 3; i++) basket.lineBetween(280, 533 + i * 15, 382, 533 + i * 15);
    this.own(basket.setDepth(6));
  }

  select(index: number) {
    if (!this.choices.length) return;
    this.selection = (index + this.choices.length) % this.choices.length;
    this.choices.forEach((choice, i) => (choice.getAt(0) as Phaser.GameObjects.Ellipse).setFillStyle(GOLD, i === this.selection ? .6 : .18));
  }

  private makeGate() {
    const arch = this.add.graphics();
    arch.fillStyle(0x7c9c85).fillRoundedRect(-125, -290, 250, 315, { tl: 125, tr: 125, bl: 14, br: 14 });
    arch.lineStyle(7, 0xbad3ad).strokeRoundedRect(-125, -290, 250, 315, { tl: 125, tr: 125, bl: 14, br: 14 });
    arch.fillStyle(0x123d39).fillRoundedRect(-97, -256, 194, 280, { tl: 97, tr: 97, bl: 0, br: 0 });
    const magic = this.add.ellipse(0, -125, 160, 245, GOLD, .27);
    const panel = this.add.graphics().fillStyle(0x386e59).fillRoundedRect(-92, -254, 184, 278, { tl: 92, tr: 92, bl: 0, br: 0 });
    panel.lineStyle(3, 0xbfd399).strokeRoundedRect(-92, -254, 184, 278, { tl: 92, tr: 92, bl: 0, br: 0 });
    panel.lineStyle(2, 0x93bb85, .6).lineBetween(-60, -198, -60, 20).lineBetween(-30, -233, -30, 20).lineBetween(0, -251, 0, 20).lineBetween(30, -233, 30, 20).lineBetween(60, -198, 60, 20);
    const symbol = this.add.star(0, -160, 4, 10, 32, GOLD);
    const knob = this.add.circle(57, -88, 8, GOLD).setStrokeStyle(3, 0x906d39);
    this.gatePanel = this.add.container(0, 0, [panel, symbol, knob]);
    this.own(this.add.container(920, 573, [arch, magic, this.gatePanel]).setDepth(4));
    this.own(this.add.text(920, 226, '✦  魔法石门  ✦', { fontSize: '19px', color: '#fff7d4', fontFamily: 'Microsoft YaHei', backgroundColor: '#285748', padding: { x: 17, y: 8 } }).setOrigin(.5));
  }

  private makeBridge() {
    const bridge = this.add.graphics();
    bridge.fillStyle(0x739fa2, .52).fillEllipse(815, 590, 690, 180);
    for (let i = 0; i < 10; i++) {
      bridge.fillStyle(i % 2 ? 0xb99767 : 0xc5a77a).fillRoundedRect(490 + i * 55, 523 + Math.sin(i / 3) * 6, 52, 71, 5);
    }
    bridge.lineStyle(6, 0x826944).lineBetween(479, 528, 1060, 528).lineBetween(479, 595, 1060, 595);
    this.own(bridge.setDepth(2));
    this.own(this.add.ellipse(515, 575, 135, 40, 0x807a51).setStrokeStyle(5, 0x9f9770).setDepth(3));
    this.fox.setPosition(1100, 570);
  }

  private makeTraining() {
    const pole = this.add.graphics().fillStyle(0x8f7051).fillRoundedRect(870, 323, 14, 257, 5);
    pole.lineStyle(9, 0x8f7051).lineBetween(876, 343, 996, 343);
    pole.fillStyle(0xbb945f).fillRoundedRect(948, 355, 85, 114, 12);
    pole.fillStyle(0xffd888, .35).fillRoundedRect(960, 368, 61, 80, 10);
    pole.lineStyle(4, 0x705e41).strokeRoundedRect(948, 355, 85, 114, 12);
    this.own(pole.setDepth(3));
    this.own(this.add.text(990, 260, '魔法练习场', { fontFamily: 'Microsoft YaHei', fontSize: '20px', color: '#fff4d0', backgroundColor: '#285748', padding: { x: 16, y: 8 } }).setOrigin(.5));
  }

  private makeBoss() {
    this.guardian = this.own(this.character('guardian', 990, 595, 315));
    this.owl = this.own(this.character('owl', 1180, 392, 115));
    const vines = this.add.graphics().lineStyle(7, 0x467750, .9);
    vines.strokeEllipse(1180, 343, 140, 145).lineBetween(1157, 278, 1145, 408).lineBetween(1180, 271, 1180, 414).lineBetween(1207, 278, 1220, 405);
    vines.setName('vines');
    this.own(vines.setDepth(8));
    this.own(this.add.text(990, 231, '苔苔 · 森林守护者', { fontFamily: 'Microsoft YaHei', fontSize: '19px', color: '#fff4d0', backgroundColor: '#285748', padding: { x: 17, y: 8 } }).setOrigin(.5));
    this.drawBossProgress();
  }

  private drawBossProgress() {
    const old = this.worldObjects.find(object => object.name === 'boss-progress');
    if (old) { this.worldObjects = this.worldObjects.filter(object => object !== old); old.destroy(); }
    const complete = ['boss-crystal', 'boss-fire', 'boss-ice', 'boss-shield'].filter(id => this.adventure.state.completed.includes(id)).length;
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < 4; i++) parts.push(this.add.star(i * 38, 0, 5, 6, 13, i < complete ? GOLD : 0x4a7362).setStrokeStyle(2, 0xe1d697, .8));
    this.own(this.add.container(933, 280, parts).setName('boss-progress').setDepth(10));
  }

  private makeCleared() {
    this.fox.setVisible(true).setPosition(560, 575);
    this.guardian = this.own(this.character('guardian', 970, 588, 265));
    this.owl = this.own(this.character('owl', 765, 568, 188));
    this.own(this.add.ellipse(670, 523, 630, 240, GOLD, .12).setDepth(1));
    this.burst(700, 345, GOLD, 32);
  }

  jump() {
    if (this.inputBlocked() || this.jumping) return;
    this.jumping = true;
    const y = this.hero.y;
    this.tweens.add({ targets: this.hero, y: y - (this.reducedMotion ? 20 : 110), duration: 290, yoyo: true, ease: 'Sine.Out', onComplete: () => { this.jumping = false; this.hero.y = y; this.adventure.action('jump'); } });
  }

  walkRight() {
    if (this.inputBlocked() || this.moving) return;
    this.moving = true;
    this.heroArt.setFlipX(false);
    this.tweens.add({ targets: this.hero, x: 1020, duration: this.reducedMotion ? 300 : 1400, ease: 'Sine.InOut', onComplete: () => { this.moving = false; this.adventure.action('right'); } });
  }

  private effect(step: Step, source: string) {
    if (!this.started) return;
    this.clearFocus();
    if (step.effect === 'door' && this.gatePanel) {
      this.burst(920, 410, GOLD, 24);
      this.tweens.add({ targets: this.gatePanel, scaleX: .06, alpha: .12, duration: this.reducedMotion ? 150 : 1000, ease: 'Cubic.InOut' });
      if (!this.reducedMotion) this.cameras.main.shake(180, .002);
    } else if (['fire', 'ice', 'shield'].includes(step.effect)) {
      this.cast(step.effect as 'fire' | 'ice' | 'shield');
    } else if (step.effect === 'fruit' || step.effect === 'crystal') {
      const choice = this.choices.find((_, i) => step.choices?.[i]?.id === step.answer);
      this.burst(choice?.x ?? 670, choice?.y ?? 475, GOLD, 16);
      if (choice) this.tweens.add({ targets: choice, x: step.effect === 'fruit' ? 330 : choice.x, y: step.effect === 'fruit' ? 532 : choice.y - 50, scale: step.effect === 'fruit' ? .25 : .9, alpha: step.effect === 'fruit' ? 0 : .25, duration: 950, ease: 'Sine.InOut' });
    } else if (step.effect === 'rescue') {
      this.burst(750, 370, GOLD, 35);
    } else if (source !== 'jump' && source !== 'right') {
      this.burst(this.fox.x, this.fox.y - 180, GOLD, 16);
      if (!this.reducedMotion) this.tweens.add({ targets: this.fox, y: this.fox.y - 28, duration: 250, yoyo: true, ease: 'Sine.Out' });
    }
    const glow = this.add.ellipse(this.hero.x, this.hero.y - 5, 150, 52, GOLD, .4).setStrokeStyle(3, 0xffedb0).setDepth(4);
    this.tweens.add({ targets: glow, scale: this.reducedMotion ? 1 : 1.7, alpha: 0, duration: 1000, onComplete: () => glow.destroy() });
    if (!this.reducedMotion) this.tweens.add({ targets: this.hero, y: this.hero.y - 18, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.Out' });
    this.burst(this.hero.x + 30, this.hero.y - 190, GOLD, 12);
    this.floatText(this.hero.x, this.hero.y - 300, '★ +1', '#fff4c1');
    if (step.world === 'boss') {
      this.drawBossProgress();
      const vines = this.worldObjects.find(object => object.name === 'vines');
      if (vines instanceof Phaser.GameObjects.Graphics) vines.setAlpha(step.effect === 'shield' ? 0 : step.effect === 'ice' ? .25 : .65);
      if (step.effect === 'shield' && this.owl) this.tweens.add({ targets: this.owl, x: 710, y: 550, duration: 1050, ease: 'Sine.Out' });
    }
  }

  private cast(spell: 'fire' | 'ice' | 'shield') {
    const color = spell === 'fire' ? 0xffb85c : spell === 'ice' ? 0xb4edff : GOLD;
    if (spell === 'shield') {
      const shield = this.add.ellipse(this.hero.x + 25, 468, 295, 315, GOLD, .2).setStrokeStyle(5, GOLD, .8).setDepth(9);
      this.burst(this.hero.x + 20, 430, GOLD, 25);
      this.tweens.add({ targets: shield, scale: 1.12, alpha: 0, duration: 1800, ease: 'Sine.Out', onComplete: () => shield.destroy() });
    } else {
      const core = this.add.circle(0, 0, 19, color, .95);
      const glow = this.add.circle(0, 0, 36, color, .2);
      const shape = this.add.star(0, 0, spell === 'ice' ? 6 : 5, 12, 29, spell === 'ice' ? 0xffffff : 0xffeaa4, .9);
      const projectile = this.add.container(this.hero.x + 110, 425, [glow, core, shape]).setDepth(12);
      this.burst(this.hero.x + 100, 425, color, 10);
      this.tweens.add({ targets: projectile, x: 985, y: this.world === 'boss' ? 438 : 407, rotation: 2, duration: 550, ease: 'Cubic.In', onComplete: () => {
        this.burst(985, 425, color, 28);
        projectile.destroy();
        if (this.guardian?.active) this.tweens.add({ targets: this.guardian, x: this.guardian.x + 14, duration: 70, yoyo: true, repeat: 2 });
        if (!this.reducedMotion) this.cameras.main.shake(130, .0016);
      } });
    }
  }

  private burst(x: number, y: number, color: number, count: number) {
    const quantity = this.reducedMotion ? Math.min(count, 5) : count;
    for (let i = 0; i < quantity; i++) {
      const particle = this.add.star(x, y, 4, 2, 4 + Math.random() * 6, color).setDepth(15);
      const angle = Math.random() * Math.PI * 2;
      const distance = 35 + Math.random() * 105;
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scale: .2, rotation: Math.random() * 4, duration: 650 + Math.random() * 450, ease: 'Cubic.Out', onComplete: () => particle.destroy() });
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, { fontFamily: 'Microsoft YaHei', fontSize: '25px', fontStyle: 'bold', color, stroke: '#386e51', strokeThickness: 4 }).setOrigin(.5).setDepth(20);
    this.tweens.add({ targets: label, y: y - 45, alpha: 0, delay: 450, duration: 1100, ease: 'Sine.Out', onComplete: () => label.destroy() });
  }

  update(_time: number, delta: number) {
    if (!this.started || this.inputBlocked() || this.moving || this.jumping || this.adventure.step.kind === 'choose' || this.adventure.state.mode === 'voice') return;
    if (this.cursors?.right.isDown || this.dKey?.isDown) {
      this.heroArt.setFlipX(false);
      if (this.adventure.step.action === 'right') { this.walkRight(); return; }
      this.hero.x = Math.min(1120, this.hero.x + delta * .32);
    } else if (this.cursors?.left.isDown || this.aKey?.isDown) {
      this.heroArt.setFlipX(true);
      this.hero.x = Math.max(150, this.hero.x - delta * .32);
    }
  }
}
