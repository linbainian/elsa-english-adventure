import Phaser from 'phaser';

export type ActorPose = 'idle' | 'blink' | 'wave' | 'listen' | 'charge' | 'cast' | 'cheer' | 'glide' | 'nose' | 'clap' | 'march' | 'blow' | 'sleep';
export type ActorTextures = Partial<Record<ActorPose, string>> & { idle: string };
export type ActorRig = { handV?: number; capeSide?: 'left' | 'right' | 'both' };
type Art = Phaser.GameObjects.Image | Phaser.GameObjects.Mesh2D;

/** Aligned key poses, cape/arm deformation and independent scene-time animation. */
export class AnimatedActor extends Phaser.GameObjects.Container {
  readonly art: Art;
  private overlay: Art;
  private textures: ActorTextures;
  private currentPose: ActorPose = 'idle';
  private poseTimers: Phaser.Time.TimerEvent[] = [];
  private blinkTimer: Phaser.Time.TimerEvent;
  private lowMotion: boolean;
  private fades: Phaser.Tweens.Tween[] = [];
  private facingLeft = false;
  private rigged: boolean;
  private lids: Phaser.GameObjects.Graphics | null = null;
  private motion = { wave: 0, reach: 0, lean: 0 };
  private rigProfile: ActorRig = {};

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, textures: ActorTextures, lowMotion: boolean, rigged = false) {
    super(scene, x, y);
    this.textures = textures;
    this.lowMotion = lowMotion;
    this.rigged = rigged && scene.game.renderer.type === Phaser.WEBGL;
    const frame = scene.textures.get(textures.idle).get();
    const shadow = scene.add.ellipse(0, -3, size * .42, size * .08, 0x717aaa, .16);
    const createArt = (): Art => {
      if (!this.rigged) return scene.add.image(0, 0, textures.idle).setOrigin(.5, 1).setDisplaySize(size * frame.width / frame.height, size);
      const vertices: number[] = [], indices: number[] = [];
      const columns = 32, rows = 24;
      for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++)
        vertices.push(column / columns * frame.width - frame.width / 2, row / rows * frame.height - frame.height, column / columns, row / rows);
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, 0, b, a + 1, b + 1, 0);
      }
      return scene.add.mesh2d(0, 0, textures.idle, vertices, indices, true).setSize(frame.width, frame.height).setScale(size / frame.height).buildOrderedIndices(1, true);
    };
    this.art = createArt();
    this.overlay = createArt().setAlpha(0);
    this.add([shadow, this.art, this.overlay]);
    if (rigged) {
      // Native eyelids close the idle illustration's eyes; no duplicate fake blink frame.
      const unit = size / 512;
      this.lids = scene.add.graphics().setVisible(false);
      for (const [ex, ey] of [[-11, -443], [15, -447]]) {
        this.lids.fillStyle(0xeed4cf).fillEllipse(ex! * unit, ey! * unit, 12 * unit, 7 * unit);
        this.lids.lineStyle(1.3 * unit, 0x5b4263).lineBetween((ex! - 4) * unit, ey! * unit, (ex! + 4) * unit, (ey! + 1) * unit);
      }
      this.add(this.lids);
    }
    scene.add.existing(this);
    this.setDepth(6);
    if (!lowMotion) scene.tweens.add({ targets: [this.art, this.overlay], y: -3, duration: 1650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.blinkTimer = scene.time.addEvent({ delay: 3300 + Math.random() * 800, loop: true, callback: () => {
      if (this.currentPose !== 'idle') return;
      if (this.textures.blink) {
        this.blend('blink', 50);
        this.poseTimers.push(scene.time.delayedCall(140, () => { if (this.currentPose === 'blink') this.blend('idle', 90); }));
      } else if (this.lids && this.art.texture.key === 'princess-idle' && this.overlay.alpha === 0) {
        this.lids.setPosition(0, this.art.y).setVisible(true);
        this.poseTimers.push(scene.time.delayedCall(135, () => this.lids?.setVisible(false)));
      }
    } });
    this.once('destroy', () => {
      this.blinkTimer.remove();
      this.cancelPoses();
      for (const target of [this, this.art, this.overlay, this.motion]) scene.tweens.killTweensOf(target);
    });
  }

  private cancelPoses() { this.poseTimers.forEach(timer => timer.remove()); this.poseTimers = []; this.lids?.setVisible(false); }
  private flipFor(texture: string) { return this.facingLeft !== (texture === 'princess-cast'); }

  private blend(pose: ActorPose, duration = 240) {
    if (!this.active) return;
    const texture = this.textures[pose] ?? this.textures.idle;
    this.currentPose = pose;
    this.lids?.setVisible(false);
    this.scene.tweens.killTweensOf(this.motion);
    this.scene.tweens.add({ targets: this.motion, wave: pose === 'wave' || pose === 'cheer' ? 1 : 0, reach: pose === 'cast' ? 1 : pose === 'charge' ? -.45 : 0, lean: pose === 'listen' ? 1 : 0, duration: this.lowMotion ? 0 : 260, ease: 'Sine.InOut' });
    this.fades.forEach(tween => tween.stop());
    this.fades = [];
    // Returning to the visible pose must also cancel an unfinished fade away from it.
    // Otherwise idle() immediately followed by hold(swim/sleep) commits the stale idle image.
    if (this.art.texture.key === texture) { this.art.setAlpha(1); this.overlay.setAlpha(0); return; }
    this.art.setAlpha(1);
    this.overlay.setTexture(texture).setFlipX(this.flipFor(texture)).setAlpha(0);
    this.fades = [this.scene.tweens.add({ targets: this.art, alpha: 0, duration: this.lowMotion ? 0 : duration, ease: 'Sine.InOut' }),
    this.scene.tweens.add({ targets: this.overlay, alpha: 1, duration: this.lowMotion ? 0 : duration, ease: 'Sine.InOut', onComplete: () => {
      if (!this.active) return;
      this.art.setTexture(texture).setFlipX(this.flipFor(texture)).setAlpha(1);
      this.overlay.setAlpha(0);
    } })];
  }

  hold(pose: ActorPose) { this.cancelPoses(); this.blend(pose); }
  idle() { this.hold('idle'); }
  setRigProfile(profile: ActorRig = {}) { this.rigProfile = profile; }
  /** Outfits share the original canvas geometry, so the rig and later poses remain aligned. */
  setTextures(textures: ActorTextures, duration = 0) {
    this.cancelPoses();
    this.textures = textures;
    this.currentPose = 'idle';
    if (duration > 0) { this.blend('idle', duration); return; }
    this.fades.forEach(tween => tween.stop()); this.fades = [];
    this.art.setTexture(textures.idle).setFlipX(this.flipFor(textures.idle)).setAlpha(1);
    this.overlay.setTexture(textures.idle).setFlipX(this.flipFor(textures.idle)).setAlpha(0);
    this.scene.tweens.killTweensOf(this.motion);
    this.motion.wave = this.motion.reach = this.motion.lean = 0;
  }
  faceLeft(left: boolean) { this.facingLeft = left; this.art.setFlipX(this.flipFor(this.art.texture.key)); this.overlay.setFlipX(this.flipFor(this.overlay.texture.key)); }

  perform(action: 'wave' | 'cast' | 'cheer', release?: () => void) {
    this.cancelPoses();
    const later = (delay: number, callback: () => void) => this.poseTimers.push(this.scene.time.delayedCall(delay, callback));
    if (action === 'cast') {
      this.blend('charge');
      later(this.lowMotion ? 80 : 320, () => { this.blend('cast', 190); release?.(); });
      later(1220, () => this.blend('idle', 300));
    } else if (action === 'wave') {
      this.blend('wave');
      if (!this.lowMotion && !this.rigged) this.scene.tweens.add({ targets: this, angle: { from: -2, to: 2 }, duration: 220, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: () => this.setAngle(0) });
      later(1150, () => this.blend('idle', 300));
    } else {
      this.blend('cheer');
      if (!this.lowMotion) this.scene.tweens.add({ targets: this, scaleX: this.scaleX * 1.035, scaleY: this.scaleY * .97, duration: 200, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
      later(1150, () => this.blend('idle', 300));
    }
  }

  animate(time: number) {
    if (!this.rigged || !this.active) return;
    for (const image of [this.art, this.overlay]) {
      if (!(image instanceof Phaser.GameObjects.Mesh2D)) continue;
      const width = image.width, height = image.height;
      for (let i = 0; i < image.vertices.length; i += 4) {
        const u = image.vertices[i + 2]!, v = image.vertices[i + 3]!;
        let x = (u - .5) * width, y = (v - 1) * height;
        if (!this.lowMotion) {
          const skirt = Phaser.Math.Clamp((v - .38) / .52, 0, 1);
          const capeSide = this.rigProfile.capeSide ?? 'right';
          const capeDistance = capeSide === 'left' ? .47 - u : capeSide === 'both' ? Math.abs(u - .5) - .03 : u - .53;
          const cape = Phaser.Math.Clamp(capeDistance / .25, 0, 1) * skirt;
          x += Math.sin(time / 950 + v * 6) * 15 * cape;
          y += Math.cos(time / 1150 + u * 5) * 4 * cape;
          const upperBody = (1 - skirt) * Math.exp(-(((u - .5) / .1) ** 2));
          x += this.motion.lean * 6 * upperBody;
          const hand = Math.exp(-(((v - (this.rigProfile.handV ?? .20)) / .10) ** 2)) * Phaser.Math.Clamp(Math.abs(u - .5) / .16, 0, 1);
          y += Math.sin(time / 145) * this.motion.wave * 8 * hand;
          x += (u < .5 ? -1 : 1) * this.motion.reach * 8 * hand;
        }
        image.vertices[i] = image.flipX ? -x : x;
        image.vertices[i + 1] = y;
      }
    }
  }
}
