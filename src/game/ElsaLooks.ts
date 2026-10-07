import type Phaser from 'phaser';
import type { ActorRig, ActorTextures } from './AnimatedActor';
import type { World } from './level';

type ElsaLook = { title: string; textures: ActorTextures; rig: ActorRig; portrait: string };
const cutout = (name: string) => 'elsa-' + name;
const portrait = (name: string) => '/assets/elsa-looks/' + name + '-portrait.png';

/** One costume per story location. Every pose stays in that costume. */
export const ELSA_LOOKS = {
  ice: {
    title: '经典冰蓝裙', textures: { idle: 'princess-idle', wave: cutout('ice-wave'), cheer: cutout('ice-cheer'), cast: 'princess-cast' },
    rig: {}, portrait: portrait('ice'),
  },
  spring: {
    title: '春日花裙', textures: { idle: cutout('spring') },
    rig: { handV: .31, capeSide: 'left' }, portrait: portrait('spring'),
  },
  garden: {
    title: '花园短裙', textures: { idle: cutout('garden') },
    rig: { handV: .49, capeSide: 'right' }, portrait: portrait('garden'),
  },
  winter: {
    title: '冬日长靴', textures: { idle: cutout('winter') },
    rig: { handV: .47, capeSide: 'both' }, portrait: portrait('winter'),
  },
  starlight: {
    title: '星光蓬裙', textures: { idle: cutout('starlight') },
    rig: { handV: .6, capeSide: 'left' }, portrait: portrait('starlight'),
  },
  spirit: {
    title: '精灵白裙', textures: { idle: cutout('spirit') },
    rig: { handV: .33, capeSide: 'left' }, portrait: portrait('spirit'),
  },
} satisfies Record<string, ElsaLook>;
export type ElsaLookId = keyof typeof ELSA_LOOKS;

const WORLD_LOOKS: Partial<Record<World, ElsaLookId>> = {
  'welcome-glade': 'ice', 'welcome-palace': 'spirit', 'welcome-party': 'starlight',
  'body-workshop': 'garden', 'body-music': 'garden', 'body-stage': 'starlight',
  'family-home': 'spring', 'family-garden': 'spring', 'family-photo': 'spirit',
  'toys-room': 'garden', 'toys-station': 'winter', 'toys-parade': 'starlight',
  'animals-shelter': 'winter', 'animals-pond': 'spring', 'animals-camp': 'winter',
  'community-street': 'garden', 'community-clinic': 'spring', 'community-plaza': 'spirit',
};

export function elsaLookId(world: World): ElsaLookId { return WORLD_LOOKS[world] ?? 'ice'; }
export function elsaLookFor(world: World): ElsaLook { return ELSA_LOOKS[elsaLookId(world)]; }
export function elsaPortrait(world: World, celebrating = false): string {
  return elsaLookId(world) === 'ice' && celebrating && !world.startsWith('wardrobe-')
    ? portrait('ice-cheer') : elsaLookFor(world).portrait;
}

export function preloadElsaLooks(scene: Phaser.Scene) {
  for (const name of ['spring', 'garden', 'winter', 'starlight', 'spirit', 'ice-wave', 'ice-cheer'])
    scene.load.image(cutout(name), '/assets/elsa-looks/' + name + '.png');
}
