import Phaser from 'phaser';
import { AnimatedActor } from './AnimatedActor';
import { SceneStory } from './SceneStory';
import type { CommunityRole, Step, World } from './level';

export const COMMUNITY_BACKGROUNDS: Partial<Record<World, string>> = {
  'community-street': 'community/street', 'community-clinic': 'community/clinic', 'community-plaza': 'community/plaza',
};
export const COMMUNITY_ROLES: CommunityRole[] = ['bus-driver', 'firefighter', 'police-officer', 'doctor', 'nurse', 'dentist'];
export const COMMUNITY_SPRITES = [...COMMUNITY_ROLES.flatMap(role => [role, role + '-wave', 'face-' + role]),
  'face-tuantuan', 'bus', 'tooth', 'brush', 'stethoscope', 'pinwheel', 'flower', 'blanket'].map(name => 'community/' + name);
const key = (name: string) => 'theme-community/' + name;
type Home = { x: number; y: number; size: number };

/** Helpers do visible jobs; repetitions ask them to do a different job in a new setting. */
export class CommunityDirector extends SceneStory {
  private world: World | null = null;
  private helpers = new Map<CommunityRole, AnimatedActor>();
  private homes = new Map<CommunityRole, Home>();
  private tuantuan: AnimatedActor | null = null;
  private bus: Phaser.GameObjects.Container | null = null;
  private doorPanels: Phaser.GameObjects.Rectangle[] = [];
  private passenger: Phaser.GameObjects.Image | null = null;
  private teddy: Phaser.GameObjects.Image | null = null;
  private tooth: Phaser.GameObjects.Image | null = null;
  private pinwheel: Phaser.GameObjects.Image | null = null;
  private flower: Phaser.GameObjects.Image | null = null;
  private blanket: Phaser.GameObjects.Image | null = null;
  private doorOpen = false;
  private toothClean = false;
  private partyStarted = false;

  override clear() {
    const active = this.world !== null;
    super.clear(); this.world = null; this.helpers.clear(); this.homes.clear(); this.tuantuan = null;
    this.bus = null; this.doorPanels = []; this.passenger = null; this.teddy = null; this.tooth = null;
    this.pinwheel = null; this.flower = null; this.blanket = null;
    this.doorOpen = false; this.toothClean = false; this.partyStarted = false;
    if (active) this.adventure.dispatchEvent(new CustomEvent('community-state', { detail: { active: false } }));
  }
  private announce() {
    const friends = COMMUNITY_ROLES.filter(role => this.adventure.state.completed.some(id => this.adventure.steps.find(step => step.id === id)?.moment?.focus === role));
    this.adventure.dispatchEvent(new CustomEvent('community-state', { detail: { active: true, friends,
      doorOpen: this.doorOpen, toothClean: this.toothClean, blanket: Boolean(this.blanket),
      passengerVisible: Boolean(this.passenger?.visible && this.passenger.alpha > 0),
      textures: Object.fromEntries([...this.helpers].map(([role, actor]) => [role, actor.art.texture.key])),
      frameWidths: [...this.helpers.values()].map(actor => actor.art.frame.width),
    } }));
  }
  build(world: World) {
    this.clear(); this.world = world;
    this.hero.setPosition(175, 560).setScale(.8).setVisible(true).setDepth(6); this.hero.faceLeft(false);
    this.buddy.setVisible(false);
    this.tuantuan = this.keep(new AnimatedActor(this.scene, 360, 558, 185, {
      idle: 'theme-body/rabbit-idle', clap: 'theme-body/rabbit-clap', cheer: 'theme-body/rabbit-clap',
    }, this.reduced)).setDepth(9);
    const roles = world === 'community-street' ? COMMUNITY_ROLES.slice(0, 3)
      : world === 'community-clinic' ? COMMUNITY_ROLES.slice(3) : COMMUNITY_ROLES;
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]!;
      const home = world === 'community-plaza' ? { x: 492 + i * 130, y: 532, size: 192 }
        : { x: (world === 'community-street' ? [540, 870, 1120] : [610, 850, 1160])[i]!, y: 545, size: 240 };
      const actor = this.keep(new AnimatedActor(this.scene, home.x, home.y, home.size, {
        idle: key(role), wave: key(role + '-wave'), cheer: key(role + '-wave'),
      }, this.reduced)).setDepth(7);
      this.helpers.set(role, actor); this.homes.set(role, home);
    }
    if (world === 'community-clinic') {
      this.keep(this.scene.add.ellipse(745, 586, 240, 55, 0xe7b0c4, .35).setDepth(3));
      this.teddy = this.image('theme-toys/teddy', 745, 585, 190, false, 9);
      this.tooth = this.image(key('tooth'), 1030, 584, 185, false, 9);
      if (this.adventure.state.completed.includes('m-nurse')) this.coverTeddy(false);
      this.toothClean = this.adventure.state.completed.includes('m-dentist');
    }
    this.announce();
  }
  showStep(step: Step) {
    this.clearTurn(); this.bus = null; this.doorPanels = []; this.passenger = null; this.pinwheel = null; this.flower = null;
    for (const [role, actor] of this.helpers) {
      const home = this.homes.get(role)!;
      this.scene.tweens.killTweensOf(actor); actor.setScale(1).setAngle(0).setVisible(true).idle();
      actor.setAlpha(1);
      this.scene.tweens.add({ targets: actor, x: home.x, y: home.y, duration: this.reduced ? 0 : 400, ease: 'Sine.InOut' });
    }
    if (this.tuantuan) {
      this.scene.tweens.killTweensOf(this.tuantuan);
      this.tuantuan.setPosition(360, 558).setVisible(true).setAlpha(1).setScale(1).idle();
    }
    const type = step.moment?.type;
    if (type === 'community-bus-door' || type === 'community-bus-ride') {
      this.makeBus(type === 'community-bus-ride');
      this.helpers.forEach((actor, role) => actor.setVisible(role === 'bus-driver' && type !== 'community-bus-ride'));
    }
    if (type === 'community-pinwheel') {
      this.keep(this.scene.add.rectangle(695, 505, 9, 128, 0xc29774).setDepth(8), true);
      this.pinwheel = this.image(key('pinwheel'), 695, 441, 175, true, 10).setOrigin(.5, .54);
    }
    if (type === 'community-duck-crossing') this.image('theme-animals/duck', 947, 586, 140, true, 11);
    if (type === 'community-flower-water') this.flower = this.image(key('flower'), 935, 590, 165, true, 11);
    const actor = this.helpers.get(step.moment?.focus as CommunityRole);
    if (actor) this.mark(actor.x, actor.y - 128, this.homes.get(step.moment!.focus as CommunityRole)!.size);
    this.announce(); this.later(500, () => this.announce());
  }
  private makeBus(riding: boolean) {
    const busArt = this.scene.add.image(0, 0, key('bus')).setOrigin(.5, 1).setDisplaySize(512, 512);
    const driver = this.scene.add.image(17, -179, key('face-bus-driver')).setDisplaySize(58, 58).setVisible(riding);
    // Faces sit in the actual window openings, rather than floating above a vehicle.
    this.passenger = this.scene.add.image(-56, -180, key('face-tuantuan')).setDisplaySize(61, 61)
      .setAlpha(riding ? 1 : 0);
    this.doorPanels = [-14, 14].map(dx => this.scene.add.rectangle(84 + dx, -136, 28, 157, 0x35bdc1).setStrokeStyle(2, 0xa7e9e2));
    this.bus = this.keep(this.scene.add.container(897, 632, [busArt, driver, this.passenger, ...this.doorPanels]).setDepth(12).setScale(.96), true);
    this.doorOpen = false;
    if (riding) this.tuantuan?.setVisible(false);
  }
  respond(step: Step): number {
    this.unmark(); this.hero.perform('wave');
    const actor = this.helpers.get(step.moment?.focus as CommunityRole);
    actor?.setAlpha(1).hold('wave');
    const type = step.moment?.type;
    switch (type) {
      case 'community-hello':
        this.hearts(540, 345); this.tuantuan?.hold('clap');
        this.later(800, () => this.hero.perform('wave')); this.sound('bell'); break;
      case 'community-ticket': this.giveTicket(); break;
      case 'community-care-thanks':
        this.hearts(850, 325, 4); this.tuantuan?.hold('clap');
        this.later(900, () => this.burst(744, 435, 0xffb4cd)); this.sound('bell'); break;
      case 'community-bus-door': this.boardBus(); break;
      case 'community-pinwheel':
        this.water(825, 442, 694, 440);
        if (this.pinwheel) this.scene.tweens.add({ targets: this.pinwheel, angle: this.reduced ? 90 : 1080, duration: 3300, ease: 'Sine.InOut' });
        this.sound('pond'); break;
      case 'community-duck-crossing': this.crossStreet(actor); break;
      case 'community-bus-ride': this.rideBus(); break;
      case 'community-heartbeat': this.heartbeat(); break;
      case 'community-blanket': this.coverTeddy(true); break;
      case 'community-tooth-brush': this.brushTooth(); break;
      case 'community-doctor-introduce':
        if (actor) this.scene.tweens.add({ targets: actor, x: actor.x - 65, duration: 800, ease: 'Sine.InOut' });
        this.hearts(610, 330, 4); this.tuantuan?.hold('clap'); this.sound('bell'); break;
      case 'community-nurse-lantern': {
        const lamp = this.image('snow-lantern', actor?.x ?? 1010, 515, 115, true, 11).setAlpha(.4);
        this.scene.tweens.add({ targets: lamp, x: 795, y: 300, alpha: 1, duration: 1400, ease: 'Sine.InOut' });
        this.later(1300, () => { this.hearts(795, 245); this.burst(795, 280); this.sound('bell'); }); break;
      }
      case 'community-smile-bubbles': this.bubbles(actor?.x ?? 1140, 345, true); this.sound('pop'); break;
      case 'community-star-path': this.walkStars(); break;
      case 'community-flower-water':
        this.water(600, 430, 935, 443);
        if (this.flower) {
          const flower = this.flower;
          this.scene.tweens.add({ targets: flower, scaleX: flower.scaleX * 1.65, scaleY: flower.scaleY * 1.65, duration: 2300, ease: 'Sine.InOut' });
          this.later(2200, () => { this.burst(935, 380, 0xffcf75, 12); this.hearts(935, 365); });
        }
        this.sound('pond'); break;
      case 'community-thank-you': this.celebrate(); break;
    }
    this.announce(); this.later(600, () => this.announce());
    return this.reduced ? 2700 : type === 'community-bus-door' ? 4200 : type === 'community-bus-ride' ? 4000 : type === 'community-thank-you' ? 4600 : 3500;
  }
  private boardBus() {
    const bus = this.bus, rabbit = this.tuantuan, passenger = this.passenger;
    if (!bus || !rabbit || !passenger) return;
    this.doorPanels.forEach((panel, i) => this.scene.tweens.add({ targets: panel, x: panel.x + (i ? 32 : -32), alpha: 0, duration: 850, ease: 'Sine.InOut' }));
    this.later(850, () => { this.doorOpen = true; this.announce(); this.sound('pop'); });
    this.later(1000, () => {
      this.scene.tweens.add({ targets: rabbit, x: bus.x + 80, y: 584, duration: 1750, ease: 'Sine.InOut', onComplete: () => {
        this.scene.tweens.add({ targets: rabbit, alpha: 0, y: 557, duration: 350 });
        this.scene.tweens.add({ targets: passenger, alpha: 1, duration: 450, delay: 150 });
        this.later(650, () => { this.hearts(bus.x - 54, bus.y - 230); this.announce(); });
      } });
    });
  }
  private rideBus() {
    if (!this.bus) return;
    const bus = this.bus;
    this.sound('bounce');
    this.scene.tweens.add({ targets: bus, x: 1550, duration: 2100, ease: 'Sine.InOut', onUpdate: tween => {
      bus.y = 632 - Math.sin(tween.progress * Math.PI * 5) * (this.reduced ? 0 : 4);
    }, onComplete: () => {
      bus.setX(-260);
      this.scene.tweens.add({ targets: bus, x: 880, y: 632, duration: 1450, ease: 'Sine.Out', onComplete: () => {
        this.burst(824, 378); this.announce();
      } });
    } });
  }
  private crossStreet(police?: AnimatedActor) {
    const duck = [...this.temporary].find(o => o instanceof Phaser.GameObjects.Image && o.texture.key === 'theme-animals/duck') as Phaser.GameObjects.Image | undefined;
    if (!duck) return;
    // Visible stripes align with the moving duck; the crossing is a helping scene, with no traffic hazard.
    for (let i = 0; i < 5; i++) this.keep(this.scene.add.rectangle(978 + i * 43, 583, 25, 62, 0xfffcf2, .75).setAngle(-8).setDepth(4), true);
    this.scene.tweens.add({ targets: duck, x: 1175, duration: 2400, ease: 'Sine.InOut', onUpdate: tween => {
      duck.y = 586 - Math.abs(Math.sin(tween.progress * Math.PI * 7)) * (this.reduced ? 0 : 7);
    }, onComplete: () => this.hearts(1160, 422) });
    if (police) this.scene.tweens.add({ targets: police, x: 1178, y: 538, duration: 2400, ease: 'Sine.InOut' });
    this.sound('bounce');
  }
  private heartbeat() {
    if (!this.teddy) return;
    const scope = this.image(key('stethoscope'), 684, 450, 118, true, 13).setAngle(-15);
    this.scene.tweens.add({ targets: scope, x: 738, y: 503, duration: 850, ease: 'Sine.InOut' });
    for (let i = 0; i < 3; i++) this.later(1000 + i * 650, () => {
      const teddy = this.teddy; if (!teddy) return;
      this.scene.tweens.add({ targets: teddy, scaleX: teddy.scaleX * 1.04, scaleY: teddy.scaleY * .98, duration: 180, yoyo: true });
      this.hearts(745, 385, 1); this.sound('clap');
    });
  }
  private coverTeddy(animated: boolean) {
    if (this.blanket) return;
    this.blanket = this.image(key('blanket'), 745, animated ? 466 : 579, 170, false, 11);
    if (animated) {
      this.blanket.setAlpha(0).setAngle(-7);
      this.scene.tweens.add({ targets: this.blanket, y: 579, alpha: 1, angle: 0, duration: 1350, ease: 'Sine.InOut' });
      this.later(1500, () => { this.hearts(745, 377); this.announce(); });
    }
  }
  private brushTooth() {
    const brush = this.image(key('brush'), 1095, 615, 140, true, 14).setAngle(-24);
    this.scene.tweens.add({ targets: brush, x: 985, y: 600, angle: -4, duration: 500, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => {
      this.toothClean = true; this.burst(1030, 426, 0xffffff, 12); this.bubbles(1030, 445); this.announce();
      if (this.tooth) this.scene.tweens.add({ targets: this.tooth, angle: { from: -2, to: 2 }, duration: 280, yoyo: true, repeat: 1, onComplete: () => this.tooth?.setAngle(0) });
    } });
    this.sound('pop');
  }
  private giveTicket() {
    const paper = this.scene.add.graphics().fillStyle(0xffefd0).fillRoundedRect(-42, -27, 84, 54, 12).lineStyle(3, 0xeec66e).strokeRoundedRect(-42, -27, 84, 54, 12);
    const star = this.scene.add.star(0, 0, 5, 7, 17, this.gold);
    const ticket = this.keep(this.scene.add.container(525, 458, [paper, star]).setDepth(15), true);
    this.scene.tweens.add({ targets: ticket, x: 373, y: 481, angle: 12, duration: 1600, ease: 'Sine.InOut', onComplete: () => {
      this.tuantuan?.hold('clap'); this.hearts(365, 335); this.sound('pop');
    } });
  }
  private walkStars() {
    for (let i = 0; i < 6; i++) this.later(i * 290, () => {
      const star = this.keep(this.scene.add.star(422 + i * 66, 579, 5, 5, 15, this.gold).setDepth(4), true);
      this.scene.tweens.add({ targets: star, alpha: .5, scale: 1.08, duration: 700, yoyo: true, repeat: 1 });
      this.sound('bell');
    });
    if (this.tuantuan) this.scene.tweens.add({ targets: this.tuantuan, x: 744, duration: 2500, ease: 'Sine.InOut', onComplete: () => this.tuantuan?.hold('clap') });
  }
  private water(x: number, y: number, endX: number, endY: number) {
    for (let i = 0; i < (this.reduced ? 6 : 14); i++) this.later(i * 140, () => {
      const drop = this.keep(this.scene.add.ellipse(x, y, 8, 13, 0x99eafa, .85).setDepth(15), true);
      this.scene.tweens.add({ targets: drop, x: endX, y: endY, duration: 800, ease: 'Sine.InOut', onUpdate: tween => {
        drop.y = Phaser.Math.Linear(y, endY, tween.progress) - Math.sin(tween.progress * Math.PI) * 70;
      }, onComplete: () => this.remove(drop) });
    });
  }
  celebrate() {
    if (this.partyStarted) return; this.partyStarted = true;
    this.helpers.forEach((actor, role) => {
      actor.setAlpha(1).hold('wave');
      const home = this.homes.get(role)!;
      this.scene.tweens.add({ targets: actor, x: home.x, y: home.y - 9, duration: 850, delay: COMMUNITY_ROLES.indexOf(role) * 100,
        yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    });
    this.hero.perform('cheer'); this.tuantuan?.hold('clap');
    this.hearts(780, 308, 6); this.bubbles(815, 330, true); this.sound('bell');
    this.later(300, () => this.announce());
  }
}
