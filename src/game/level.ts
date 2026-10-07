import { LEVEL_4 } from './toyLevel.ts';
import { LEVEL_5 } from './wardrobeLevel.ts';
import { LEVEL_6 } from './animalLevel.ts';
import { LEVEL_1 } from './welcomeLevel.ts';
import { LEVEL_7 } from './communityLevel.ts';

export type World = 'meet' | 'orchard' | 'gate' | 'bridge' | 'training' | 'boss' | 'cleared'
  | 'body-workshop' | 'body-music' | 'body-stage' | 'family-home' | 'family-garden' | 'family-photo'
  | 'toys-room' | 'toys-station' | 'toys-parade' | 'wardrobe-closet' | 'wardrobe-garden' | 'wardrobe-ball'
  | 'animals-shelter' | 'animals-pond' | 'animals-camp'
  | 'welcome-glade' | 'welcome-palace' | 'welcome-party' | 'community-street' | 'community-clinic' | 'community-plaza';
export type Effect = 'greet' | 'friend' | 'fruit' | 'door' | 'jump' | 'walk' | 'fire' | 'ice' | 'shield' | 'crystal' | 'rescue' | 'body' | 'family' | 'toys' | 'clothes' | 'animals' | 'welcome' | 'community';
export type Choice = { id: string; label: string; asset?: string; color?: string };
export type BodyPart = 'eyes' | 'nose' | 'mouth' | 'ears' | 'hands' | 'feet';
export type FamilyMember = 'mommy' | 'daddy' | 'grandma' | 'grandpa' | 'baby';
export type Toy = 'ball' | 'teddy' | 'doll' | 'car' | 'train' | 'blocks';
export type Clothing = 'dress' | 'shoes' | 'hat' | 'shirt' | 'skirt' | 'coat';
export type Animal = 'cat' | 'dog' | 'rabbit' | 'bird' | 'duck' | 'fish';
export type CommunityRole = 'bus-driver' | 'doctor' | 'nurse' | 'dentist' | 'firefighter' | 'police-officer';
export type WelcomeWord = 'hello' | 'name' | 'please' | 'thanks' | 'welcome' | 'go' | 'goodbye';
export type WardrobeLook = 'casual' | 'dress' | 'shirt' | 'skirt' | 'coat' | 'ballgown';
export type WardrobeChange = { look?: WardrobeLook; hat?: boolean; shoes?: 'plain' | 'pink' | 'sparkle' };
export type ThemeMoment = {
  type: 'nose-wiggle' | 'peekaboo' | 'body-bubbles' | 'nose-mirror' | 'listen-bells' | 'clap-lights' | 'footprints' | 'hand-ribbons' | 'feet-count' | 'eyes-lights' | 'mouth-stars' | 'hands-curtain' | 'body-dance' | 'family-welcome' | 'family-gift' | 'family-introduce' | 'family-rock' | 'family-story' | 'family-balloon' | 'family-bubbles' | 'family-picnic' | 'family-together' | 'family-photo-call' | 'family-grandpa-join' | 'family-photo' | 'family-love'
    | 'toy-ball-bounce' | 'toy-teddy-hug' | 'toy-doll-spin' | 'toy-ball-roll' | 'toy-blocks-build' | 'toy-car-drive' | 'toy-train-start' | 'toy-train-ride' | 'toy-doll-conduct' | 'toy-teddy-cheer' | 'toy-ball-confetti' | 'toy-car-carry' | 'toy-parade'
    | 'wardrobe-dress' | 'wardrobe-shoes' | 'wardrobe-hat' | 'wardrobe-mirror' | 'wardrobe-shirt' | 'wardrobe-skirt' | 'wardrobe-coat' | 'wardrobe-rainbow' | 'wardrobe-ballgown' | 'wardrobe-footsteps' | 'wardrobe-hat-away' | 'wardrobe-portrait' | 'wardrobe-dance'
    | 'animal-cat-wake' | 'animal-dog-fetch' | 'animal-rabbit-hop' | 'animal-cat-peek' | 'animal-bird-fly' | 'animal-duck-paddle' | 'animal-fish-swim' | 'animal-fish-window' | 'animal-cat-groom' | 'animal-dog-shake' | 'animal-rabbit-rest' | 'animal-duck-duet' | 'animal-party'
    | 'welcome-wave' | 'welcome-name' | 'welcome-depart' | 'welcome-gift' | 'welcome-knock' | 'welcome-door' | 'welcome-lantern' | 'welcome-bow' | 'welcome-owl-peek' | 'welcome-owl-fly' | 'welcome-snowflake' | 'welcome-hug' | 'welcome-goodbye'
    | 'community-hello' | 'community-ticket' | 'community-care-thanks' | 'community-bus-door' | 'community-pinwheel' | 'community-duck-crossing' | 'community-bus-ride' | 'community-heartbeat' | 'community-blanket' | 'community-tooth-brush' | 'community-doctor-introduce' | 'community-nurse-lantern' | 'community-smile-bubbles' | 'community-star-path' | 'community-flower-water' | 'community-thank-you';
  focus: BodyPart | FamilyMember | Toy | Clothing | Animal | CommunityRole | WelcomeWord | 'family' | 'toys' | 'clothes' | 'animals' | 'community';
  wardrobe?: WardrobeChange;
};

export type UnitRef = 'BF1-U1' | 'BF1-U2' | 'BF1-U3' | 'BF1-U4' | 'BF1-U5' | 'BF1-U6' | 'BF1-U7' | 'BF1-U8' | 'showtime' | 'welcome';
export type Step = {
  id: string;
  act: number;
  world: World;
  kind: 'say' | 'choose' | 'action';
  title: string;
  npc: string;
  translation: string;
  target?: string;
  meaning?: string;
  tip: string;
  effect: Effect;
  success: string;
  choices?: Choice[];
  answer?: string;
  action?: 'jump' | 'right';
  matcher?: 'name' | 'like';
  /** Brief spoken Chinese guidance for pre-readers; only the English target is practised. */
  coach?: string;
  moment?: ThemeMoment;
  praise?: string;
  holdMs?: number;
};

/** 一个 Big Fun 单元 = 一个关卡主题：词汇、句型、教学目标都从这里长出来。 */
export type ThemeUnit = {
  ref: UnitRef;
  bigFun: string;
  unit: string;
  title: string;
  vocab: string[];
  patterns: string[];
};

export const UNITS: Record<UnitRef, ThemeUnit> = {
  welcome: {
    ref: 'welcome', bigFun: '新手情景', unit: 'Greetings & Kindness', title: '问候与礼貌',
    vocab: ['hello', 'name', "let's go", 'please', 'thank you', "you're welcome", 'goodbye'],
    patterns: ['Hello!', 'My name is ___.', 'Please!', 'Thank you!', "You're welcome!", 'Goodbye!'],
  },
  'BF1-U1': {
    ref: 'BF1-U1', bigFun: 'Big Fun 1 · Unit 1', unit: 'My Class', title: '我的教室',
    vocab: ['chair', 'crayon', 'paper', 'puppet', 'shelf', 'table'],
    patterns: ['What is this?', 'This is a ___.'],
  },
  'BF1-U2': {
    ref: 'BF1-U2', bigFun: 'Big Fun 1 · Unit 2', unit: 'My Body', title: '认识身体',
    vocab: ['eyes', 'nose', 'mouth', 'ears', 'hands', 'feet'],
    patterns: ['I have a nose.', 'I have two ___.'],
  },
  'BF1-U3': {
    ref: 'BF1-U3', bigFun: 'Big Fun 1 · Unit 3', unit: 'My Family', title: '我的家庭',
    vocab: ['mommy', 'daddy', 'grandma', 'grandpa', 'baby', 'family'],
    patterns: ['This is my ___.', 'I love my family.'],
  },
  'BF1-U4': {
    ref: 'BF1-U4', bigFun: 'Big Fun 1 · Unit 4', unit: 'My Toys', title: '我的玩具',
    vocab: ['ball', 'teddy bear', 'doll', 'blocks', 'car', 'train'],
    patterns: ["It's my ___.", 'I like my toys.'],
  },
  'BF1-U5': {
    ref: 'BF1-U5', bigFun: 'Big Fun 1 · Unit 5', unit: 'My Lunch', title: '我的午餐',
    vocab: ['apple', 'banana', 'pear', 'like'],
    patterns: ['Find the ___.', 'I like ___.'],
  },
  'BF1-U6': {
    ref: 'BF1-U6', bigFun: 'Big Fun 1 · Unit 6', unit: 'My Clothes', title: '我的衣服',
    vocab: ['dress', 'shoes', 'hat', 'shirt', 'skirt', 'coat'],
    patterns: ['My dress.', 'My coat.', 'I like my dress.'],
  },
  'BF1-U7': {
    ref: 'BF1-U7', bigFun: 'Big Fun 1 · Unit 7', unit: 'Animals', title: '动物朋友',
    vocab: ['cat', 'dog', 'rabbit', 'bird', 'duck', 'fish', 'animals'],
    patterns: ['I see a ___.', 'I like animals.'],
  },
  'BF1-U8': {
    ref: 'BF1-U8', bigFun: 'Big Fun 1 · Unit 8', unit: 'My World', title: '社区职业伙伴',
    vocab: ['bus driver', 'doctor', 'nurse', 'dentist', 'firefighter', 'police officer'],
    patterns: ['I see a doctor.', 'I see a nurse.', 'Thank you!'],
  },
  showtime: {
    ref: 'showtime', bigFun: 'Big Fun 1 · Show Time', unit: 'Review', title: '单元复习',
    vocab: ['red', 'blue', 'yellow', 'fire', 'ice', 'shield'],
    patterns: ['Find the ___ crystal.', 'Use your ___ magic!'],
  },
};

/** 一关 = 一次完整冒险：主题单元、五（或四）幕旅程、全部步骤、给星节点。 */
export type LevelAct = { title: string; subtitle: string; icon: string; world: World; unit?: UnitRef };
export type LevelConfig = {
  id: number;
  title: string;
  intro: { heading: string; description: string };
  units: UnitRef[];
  acts: LevelAct[];
  steps: Step[];
  /** 完成这些步骤时点亮"森林星光"（每关 3 颗）。 */
  starStepIds: string[];
  /** 本关是否包含元素魔法训练（决定HUD魔法栏）。 */
  spells?: boolean;
  theme?: 'body' | 'family' | 'toys' | 'clothes' | 'animals' | 'welcome' | 'community';
};

const fruitChoices: Choice[] = [
  { id: 'banana', label: '香蕉', asset: 'banana' },
  { id: 'apple', label: '苹果', asset: 'apple' },
  { id: 'pear', label: '梨', asset: 'pear' },
];
/* ---------- 第 1 关 · 冰雪奇遇（My Class + My Lunch + Show Time） ---------- */

/** Historical mixed prototype retained for reference; not in the playable level list. */
export const LEGACY_FOREST: LevelConfig = {
  id: 1,
  title: '冰雪奇遇',
  intro: { heading: '一起去森林<br>交个新朋友吧。', description: '星光不见了，小猫头鹰也被困住了。雪宝需要一位勇敢的英语小英雄。' },
  units: ['BF1-U1', 'BF1-U5', 'showtime'],
  starStepIds: ['like', 'thanks', 'boss-shield'],
  spells: true,
  acts: [
    { title: '遇见伙伴', subtitle: 'A new friend', icon: 'ice', world: 'meet', unit: 'BF1-U1' },
    { title: '雪地野餐', subtitle: 'A little picnic', icon: 'apple', world: 'orchard', unit: 'BF1-U5' },
    { title: '冰雪城堡', subtitle: 'Words open worlds', icon: 'door', world: 'gate', unit: 'BF1-U1' },
    { title: '学会魔法', subtitle: 'Your voice, your power', icon: 'sparkles', world: 'training' },
    { title: '雪花派对', subtitle: 'The forest guardian', icon: 'flag', world: 'boss', unit: 'showtime' },
  ],
  steps: [
    { id: 'hello', act: 0, world: 'meet', kind: 'say', title: '和雪宝打个招呼', npc: "Hello! I'm Pip!", translation: '你好！我是雪宝！', target: 'Hello!', meaning: '你好！', tip: '先听雪宝说，再跟着说声 Hello。麦克风自动亮起，你只需要勇敢开口。', effect: 'greet', success: '雪宝听见了！你们成为了新朋友。' },
    { id: 'name', act: 0, world: 'meet', kind: 'say', title: '告诉雪宝你的名字', npc: "What's your name?", translation: '你叫什么名字？', target: 'My name is Leo.', meaning: '我的名字是 Leo。', matcher: 'name', tip: '把 Leo 换成自己的名字也可以。雪宝很想认识你！', effect: 'friend', success: '名字被记在了冒险手册上。欢迎，小小冒险家！' },
    { id: 'go', act: 0, world: 'meet', kind: 'say', title: '邀请伙伴一起出发', npc: "Let's help the forest!", translation: '我们一起帮助森林吧！', target: "Let's go!", meaning: '出发吧！', tip: '森林的星光被藏起来了。和雪宝一起找回它们吧。', effect: 'friend', success: '出发！雪宝会一直陪着你。' },
    { id: 'apple', act: 1, world: 'orchard', kind: 'choose', title: '用声音召唤苹果', npc: 'Find the apple.', translation: '找到苹果。', target: 'Apple!', meaning: '苹果！', choices: fruitChoices, answer: 'apple', tip: '听到 Find the apple，跟读 Apple！苹果会自己飞进野餐篮，不用点击。', effect: 'fruit', success: '苹果飞进野餐篮啦！声音也能采水果。' },
    { id: 'banana', act: 1, world: 'orchard', kind: 'choose', title: '用声音召唤香蕉', npc: 'Find the banana.', translation: '找到香蕉。', target: 'Banana!', meaning: '香蕉！', choices: fruitChoices, answer: 'banana', tip: 'Banana 是弯弯的、黄色的水果。跟读它的名字，让它飞过来。', effect: 'fruit', success: '香蕉也飞进篮子啦！雪宝开心得挥起了小手。' },
    { id: 'pear', act: 1, world: 'orchard', kind: 'choose', title: '再召唤一份森林点心', npc: 'Find the pear.', translation: '找到梨。', target: 'Pear!', meaning: '梨！', choices: fruitChoices, answer: 'pear', tip: '跟读 Pear，完成最后一次声音采摘。读完稍停一下，魔法就会生效。', effect: 'fruit', success: '野餐篮装满了！三个水果词都认识了。' },
    { id: 'like', act: 1, world: 'orchard', kind: 'say', title: '告诉雪宝你喜欢什么', npc: 'What do you like?', translation: '你喜欢什么？', target: 'I like apples.', meaning: '我喜欢苹果。', matcher: 'like', tip: '你也可以说 I like bananas. 或 I like pears.。说自己喜欢的就好！', effect: 'fruit', success: '一起分享喜欢的东西，是朋友之间的小魔法。' },
    { id: 'door', act: 2, world: 'gate', kind: 'say', title: '用英语打开魔法门', npc: 'Can you open the door?', translation: '你能打开这扇门吗？', target: 'Open the door!', meaning: '打开门！', tip: '这扇门只会回应冒险家的声音。读出咒语，看看会发生什么。', effect: 'door', success: '轰——魔法门打开了！声音真的能改变世界。' },
    { id: 'thanks', act: 2, world: 'gate', kind: 'say', title: '谢谢守门的精灵', npc: 'You did it! Here is your star.', translation: '你做到了！这是你的星星。', target: 'Thank you!', meaning: '谢谢你！', tip: '礼貌也是一种魔法。谢谢精灵，再继续前进。', effect: 'friend', success: '精灵送给你一颗勇气星。' },
    { id: 'bridge-jump', act: 2, world: 'bridge', kind: 'action', title: '用声音跳过小雪球', npc: 'Jump!', translation: '跳！', target: 'Jump!', meaning: '跳！', action: 'jump', tip: '跟着雪宝说 Jump！角色就会跳起来，不用按键。', effect: 'jump', success: '轻轻一跃！你安全地跳过了小雪球。' },
    { id: 'bridge-right', act: 2, world: 'bridge', kind: 'action', title: '用声音带伙伴过桥', npc: 'Go right!', translation: '向右走！', target: 'Go right!', meaning: '向右走！', action: 'right', tip: '跟读 Go right，让角色沿桥向右走。伙伴正在另一边等你。', effect: 'walk', success: '过桥成功！森林深处的魔法空地就在前面。' },
    { id: 'learn-fire', act: 3, world: 'training', kind: 'say', title: '学会第一道元素魔法', npc: 'Say Fire to light the lantern!', translation: '说 Fire，点亮灯笼！', target: 'Fire!', meaning: '火焰！', tip: '用声音召唤一团暖暖的火。练习区里的灯笼需要你的帮助。', effect: 'fire', success: '灯笼亮了！你学会了火焰魔法。' },
    { id: 'learn-ice', act: 3, world: 'training', kind: 'say', title: '试试冰晶魔法', npc: 'Say Ice to make a snowflake!', translation: '说 Ice，变出一片雪花！', target: 'Ice!', meaning: '冰！', tip: '这道魔法凉凉的、亮晶晶的。大胆读出来吧。', effect: 'ice', success: '雪花飞起来了！你学会了冰晶魔法。' },
    { id: 'learn-shield', act: 3, world: 'training', kind: 'say', title: '保护自己和伙伴', npc: 'Say Shield to protect us!', translation: '说 Shield，保护我们！', target: 'Shield!', meaning: '护盾！', tip: '念出 Shield，让金色的魔法泡泡保护你和雪宝。', effect: 'shield', success: '金色护盾升起来了！三种魔法都准备好了。' },
    { id: 'boss-crystal', act: 4, world: 'boss', kind: 'choose', title: '用声音点亮红色水晶', npc: 'Find the red crystal.', translation: '找到红色水晶。', target: 'Red!', meaning: '红色！', choices: [{ id: 'blue', label: '蓝色水晶', color: '#80cddd' }, { id: 'red', label: '红色水晶', color: '#f18b73' }, { id: 'yellow', label: '黄色水晶', color: '#f7d879' }], answer: 'red', tip: '跟着雪宝说 Red，用声音点亮红色水晶，解开绒绒的星星。', effect: 'crystal', success: '红色水晶亮了！守护者的第一层星星解开了。' },
    { id: 'boss-fire', act: 4, world: 'boss', kind: 'say', title: '送给绒绒一颗暖暖的星星', npc: 'Use your fire magic!', translation: '使用你的火焰魔法！', target: 'Fire!', meaning: '火焰！', tip: '念出刚学会的咒语。给绒绒变一颗温暖的星星。', effect: 'fire', success: '绒绒收到暖暖的星星，高兴得跳了起来。' },
    { id: 'boss-jump', act: 4, world: 'boss', kind: 'action', title: '和绒绒一起跳一下', npc: 'Jump!', translation: '跳！', target: 'Jump!', meaning: '跳！', action: 'jump', tip: '绒绒邀请你一起跳！跟读 Jump，用声音让角色跳起来。', effect: 'jump', success: '漂亮的一跳！绒绒为你的声音魔法欢呼。' },
    { id: 'boss-ice', act: 4, world: 'boss', kind: 'say', title: '送给绒绒亮晶晶的雪花', npc: 'Use your ice magic!', translation: '使用你的冰晶魔法！', target: 'Ice!', meaning: '冰！', tip: '再用一种英语魔法，救出小伙伴。', effect: 'ice', success: '冰晶闪亮！绒绒和小猫头鹰都喜欢你的雪花。' },
    { id: 'boss-shield', act: 4, world: 'boss', kind: 'say', title: '用护盾接住森林星光', npc: 'Protect our little friend!', translation: '保护我们的小伙伴！', target: 'Shield!', meaning: '护盾！', tip: '森林星光要回来了！让护盾接住猫头鹰和闪亮的星星。', effect: 'shield', success: '星光回来了！绒绒也愿意和大家做朋友了。' },
    { id: 'welcome', act: 4, world: 'cleared', kind: 'say', title: '给新朋友一个温暖的回答', npc: 'Thank you, my friend!', translation: '谢谢你，我的朋友！', target: "You're welcome!", meaning: '不客气！', tip: '小猫头鹰得救了。回它一句不客气，为这次冒险画上句号。', effect: 'rescue', success: '魔法森林重新亮起来了。你是今天的森林小英雄！' },
  ],
};

/* ---------- 第 2 关 · 身体动一动 ---------- */
const LEVEL_2: LevelConfig = {
  "id": 2,
  "title": "身体动一动",
  "intro": {
    "heading": "一起帮团团，<br>变出身体小魔法！",
    "description": "从水晶洗漱室，到泡泡音乐房，再飞上云朵舞台。小鼻子、小手和小脚，各有一种好玩的魔法。"
  },
  "units": [
    "BF1-U2"
  ],
  "starStepIds": [
    "b-nose-say",
    "b-hands-say",
    "b-finale"
  ],
  "spells": false,
  "theme": "body",
  "acts": [
    {
      "title": "水晶洗漱室",
      "subtitle": "Peekaboo & bubbles",
      "icon": "ice",
      "world": "body-workshop",
      "unit": "BF1-U2"
    },
    {
      "title": "泡泡音乐房",
      "subtitle": "Clap & stomp",
      "icon": "volume",
      "world": "body-music",
      "unit": "BF1-U2"
    },
    {
      "title": "云朵舞台",
      "subtitle": "Our body dance",
      "icon": "sparkles",
      "world": "body-stage",
      "unit": "BF1-U2"
    }
  ],
  "steps": [
    {
      "id": "b-nose",
      "act": 0,
      "world": "body-workshop",
      "kind": "say",
      "title": "给痒痒的鼻子一点魔法",
      "npc": "My nose is tickly!",
      "translation": "我的鼻子痒痒的！",
      "target": "Nose!",
      "meaning": "鼻子！",
      "coach": "团团的鼻子痒痒的。摸摸自己的鼻子，跟艾莎说鼻子的英语吧。",
      "tip": "团团的鼻子痒痒的。摸摸自己的鼻子，跟艾莎说鼻子的英语吧。",
      "effect": "body",
      "success": "团团揉揉鼻子，笑得耳朵都晃起来啦。",
      "moment": {
        "type": "nose-wiggle",
        "focus": "nose"
      },
      "praise": "Good!",
      "holdMs": 3600
    },
    {
      "id": "b-eyes",
      "act": 0,
      "world": "body-workshop",
      "kind": "say",
      "title": "和团团玩躲猫猫",
      "npc": "Where are my eyes?",
      "translation": "我的眼睛在哪里？",
      "target": "Eyes!",
      "meaning": "眼睛！",
      "coach": "团团把眼睛闭起来啦。说一声眼睛的英语，叫它看看你。",
      "tip": "团团把眼睛闭起来啦。说一声眼睛的英语，叫它看看你。",
      "effect": "body",
      "success": "躲猫猫！团团睁开眼睛，发现了你。",
      "moment": {
        "type": "peekaboo",
        "focus": "eyes"
      },
      "praise": "Great job!",
      "holdMs": 3600
    },
    {
      "id": "b-mouth",
      "act": 0,
      "world": "body-workshop",
      "kind": "say",
      "title": "变出一串彩虹泡泡",
      "npc": "My mouth makes bubbles!",
      "translation": "我的嘴巴会变泡泡！",
      "target": "Mouth!",
      "meaning": "嘴巴！",
      "coach": "团团想吹泡泡。指指小嘴巴，跟着说，就能看到彩虹泡泡。",
      "tip": "团团想吹泡泡。指指小嘴巴，跟着说，就能看到彩虹泡泡。",
      "effect": "body",
      "success": "噗噗噗！小嘴巴吹出好多彩虹泡泡。",
      "moment": {
        "type": "body-bubbles",
        "focus": "mouth"
      },
      "praise": "Well done!",
      "holdMs": 3600
    },
    {
      "id": "b-nose-say",
      "act": 0,
      "world": "body-workshop",
      "kind": "say",
      "title": "送给镜子一个小鼻子",
      "npc": "Touch your nose.",
      "translation": "摸摸你的鼻子。",
      "target": "I have a nose.",
      "meaning": "我有一个鼻子。",
      "coach": "跟艾莎说我有一个鼻子，请镜子照一照。",
      "tip": "跟艾莎说我有一个鼻子，请镜子照一照。",
      "effect": "body",
      "success": "镜子里的小鼻子亮了，你和团团一起变出爱心。",
      "moment": {
        "type": "nose-mirror",
        "focus": "nose"
      },
      "praise": "Amazing!",
      "holdMs": 3600
    },
    {
      "id": "b-ears",
      "act": 1,
      "world": "body-music",
      "kind": "say",
      "title": "听听是谁在唱歌",
      "npc": "Listen with your ears.",
      "translation": "用耳朵听一听。",
      "target": "Ears!",
      "meaning": "耳朵！",
      "coach": "听，铃铛在叫你。摸摸小耳朵，跟着艾莎说。",
      "tip": "听，铃铛在叫你。摸摸小耳朵，跟着艾莎说。",
      "effect": "body",
      "success": "叮叮当！团团竖起耳朵，找到了唱歌的铃铛。",
      "moment": {
        "type": "listen-bells",
        "focus": "ears"
      },
      "praise": "Cool!",
      "holdMs": 3600
    },
    {
      "id": "b-hands",
      "act": 1,
      "world": "body-music",
      "kind": "say",
      "title": "拍手点亮音乐泡泡",
      "npc": "Clap your hands!",
      "translation": "拍拍你的手！",
      "target": "Hands!",
      "meaning": "手！",
      "coach": "音乐泡泡还没亮。举起两只小手，说一声，让团团帮你拍拍手。",
      "tip": "音乐泡泡还没亮。举起两只小手，说一声，让团团帮你拍拍手。",
      "effect": "body",
      "success": "啪、啪、啪！每拍一下，都亮起一个音乐泡泡。",
      "moment": {
        "type": "clap-lights",
        "focus": "hands"
      },
      "praise": "Good!",
      "holdMs": 3600
    },
    {
      "id": "b-feet",
      "act": 1,
      "world": "body-music",
      "kind": "say",
      "title": "让小脚画出彩色脚印",
      "npc": "Stomp your feet!",
      "translation": "跺跺你的小脚！",
      "target": "Feet!",
      "meaning": "脚！",
      "coach": "团团想画画。指指自己的小脚，说一声，小脚印就会排成队。",
      "tip": "团团想画画。指指自己的小脚，说一声，小脚印就会排成队。",
      "effect": "body",
      "success": "咚咚咚！小脚走过的地方，长出了彩色脚印。",
      "moment": {
        "type": "footprints",
        "focus": "feet"
      },
      "praise": "Great job!",
      "holdMs": 3600
    },
    {
      "id": "b-hands-say",
      "act": 1,
      "world": "body-music",
      "kind": "say",
      "title": "用两只手放飞彩带",
      "npc": "Show me two hands.",
      "translation": "让我看看两只手。",
      "target": "I have two hands.",
      "meaning": "我有两只手。",
      "coach": "你有两只小手。伸出来，跟着说一句，帮团团放飞彩带。",
      "tip": "你有两只小手。伸出来，跟着说一句，帮团团放飞彩带。",
      "effect": "body",
      "success": "两只小手举起来！音乐房飘起彩带。",
      "moment": {
        "type": "hand-ribbons",
        "focus": "hands"
      },
      "praise": "Well done!",
      "holdMs": 3600
    },
    {
      "id": "b-feet-say",
      "act": 2,
      "world": "body-stage",
      "kind": "say",
      "title": "踩亮云朵舞台",
      "npc": "Show me two feet.",
      "translation": "让我看看两只脚。",
      "target": "I have two feet.",
      "meaning": "我有两只脚。",
      "coach": "我们到云朵上啦。看看自己的两只小脚，跟着说，让舞台亮起来。",
      "tip": "我们到云朵上啦。看看自己的两只小脚，跟着说，让舞台亮起来。",
      "effect": "body",
      "success": "一只、两只！云朵上的脚印亮起来啦。",
      "moment": {
        "type": "feet-count",
        "focus": "feet"
      },
      "praise": "Amazing!",
      "holdMs": 3600
    },
    {
      "id": "b-review-eyes",
      "act": 2,
      "world": "body-stage",
      "kind": "say",
      "title": "叫醒舞台上的星星",
      "npc": "Eyes, open wide!",
      "translation": "眼睛，睁大一点！",
      "target": "Eyes!",
      "meaning": "眼睛！",
      "coach": "星星在睡觉。还记得眼睛的英语吗？跟着说，叫星星睁开眼睛。",
      "tip": "星星在睡觉。还记得眼睛的英语吗？跟着说，叫星星睁开眼睛。",
      "effect": "body",
      "success": "小星星醒啦！它眨眨眼睛，为你照亮舞台。",
      "moment": {
        "type": "eyes-lights",
        "focus": "eyes"
      },
      "praise": "Cool!",
      "holdMs": 3600
    },
    {
      "id": "b-review-mouth",
      "act": 2,
      "world": "body-stage",
      "kind": "say",
      "title": "把泡泡吹成星星",
      "npc": "Mouth, make a wish!",
      "translation": "嘴巴，许个愿吧！",
      "target": "Mouth!",
      "meaning": "嘴巴！",
      "coach": "泡泡还想再来玩。说说嘴巴的英语，这次泡泡会变成星星。",
      "tip": "泡泡还想再来玩。说说嘴巴的英语，这次泡泡会变成星星。",
      "effect": "body",
      "success": "泡泡变成小星星！云朵舞台闪闪发光。",
      "moment": {
        "type": "mouth-stars",
        "focus": "mouth"
      },
      "praise": "Good!",
      "holdMs": 3600
    },
    {
      "id": "b-review-hands",
      "act": 2,
      "world": "body-stage",
      "kind": "say",
      "title": "拍拍手，请伙伴出场",
      "npc": "Hands, clap together!",
      "translation": "小手，一起拍一拍！",
      "target": "Hands!",
      "meaning": "手！",
      "coach": "雪宝躲在彩带后面。说说小手的英语，再拍一拍，请它上台。",
      "tip": "雪宝躲在彩带后面。说说小手的英语，再拍一拍，请它上台。",
      "effect": "body",
      "success": "彩带打开，雪宝出来啦！朋友们都准备好了。",
      "moment": {
        "type": "hands-curtain",
        "focus": "hands"
      },
      "praise": "Great job!",
      "holdMs": 3600
    },
    {
      "id": "b-finale",
      "act": 2,
      "world": "body-stage",
      "kind": "say",
      "title": "大家一起来跳云朵舞",
      "npc": "Feet, let's dance!",
      "translation": "小脚，我们跳舞吧！",
      "target": "Feet!",
      "meaning": "脚！",
      "coach": "说说小脚的英语，和团团、雪宝一起跳舞。",
      "tip": "说说小脚的英语，和团团、雪宝一起跳舞。",
      "effect": "body",
      "success": "小脚跳舞、小手挥挥！身体魔法派对开始啦。",
      "moment": {
        "type": "body-dance",
        "focus": "feet"
      },
      "praise": "Well done!",
      "holdMs": 3600
    }
  ]
};

/* ---------- 第 3 关 · 我的家庭 ---------- */
const LEVEL_3: LevelConfig = {
  "id": 3,
  "title": "我的家庭",
  "intro": {
    "heading": "邀请团团的家人，<br>办一场暖暖的派对！",
    "description": "妈妈带来拥抱，奶奶带来故事，宝宝喜欢泡泡。最后到星光照相馆，用声音留下全家福。"
  },
  "units": [
    "BF1-U3"
  ],
  "starStepIds": [
    "f-thisis",
    "f-family",
    "f-love"
  ],
  "spells": false,
  "theme": "family",
  "acts": [
    {
      "title": "温暖的客厅",
      "subtitle": "Meet my family",
      "icon": "heart",
      "world": "family-home",
      "unit": "BF1-U3"
    },
    {
      "title": "蘑菇花园",
      "subtitle": "Our family picnic",
      "icon": "leaf",
      "world": "family-garden",
      "unit": "BF1-U3"
    },
    {
      "title": "星光照相馆",
      "subtitle": "A family memory",
      "icon": "star",
      "world": "family-photo",
      "unit": "BF1-U3"
    }
  ],
  "steps": [
    {
      "id": "f-mommy",
      "act": 0,
      "world": "family-home",
      "kind": "say",
      "title": "请妈妈来开一个温暖的派对",
      "npc": "This is my mommy.",
      "translation": "这是我的妈妈。",
      "target": "Mommy!",
      "meaning": "妈妈！",
      "coach": "团团想请家人参加派对。先说说妈妈的英语，请妈妈来抱抱。",
      "tip": "团团想请家人参加派对。先说说妈妈的英语，请妈妈来抱抱。",
      "effect": "family",
      "success": "妈妈走过来，送给团团一个大大的拥抱。",
      "moment": {
        "type": "family-welcome",
        "focus": "mommy"
      },
      "praise": "Good!",
      "holdMs": 3600
    },
    {
      "id": "f-daddy",
      "act": 0,
      "world": "family-home",
      "kind": "say",
      "title": "帮爸爸带来小惊喜",
      "npc": "Here comes Daddy!",
      "translation": "爸爸来啦！",
      "target": "Daddy!",
      "meaning": "爸爸！",
      "coach": "爸爸抱着礼物来啦。说说爸爸的英语，看看礼物里藏了什么。",
      "tip": "爸爸抱着礼物来啦。说说爸爸的英语，看看礼物里藏了什么。",
      "effect": "family",
      "success": "爸爸的礼物打开啦！一颗爱心气球飞出来。",
      "moment": {
        "type": "family-gift",
        "focus": "daddy"
      },
      "praise": "Great job!",
      "holdMs": 3600
    },
    {
      "id": "f-thisis",
      "act": 0,
      "world": "family-home",
      "kind": "say",
      "title": "把妈妈介绍给艾莎",
      "npc": "Meet my mommy.",
      "translation": "来认识我的妈妈。",
      "target": "This is my mommy.",
      "meaning": "这是我的妈妈。",
      "coach": "艾莎想认识妈妈。跟团团说一句，把妈妈介绍给她吧。",
      "tip": "艾莎想认识妈妈。跟团团说一句，把妈妈介绍给她吧。",
      "effect": "family",
      "success": "妈妈和艾莎挥挥手，相册里的第一张照片亮了。",
      "moment": {
        "type": "family-introduce",
        "focus": "mommy"
      },
      "praise": "Well done!",
      "holdMs": 3600
    },
    {
      "id": "f-baby",
      "act": 0,
      "world": "family-home",
      "kind": "say",
      "title": "轻轻叫醒小宝宝",
      "npc": "Shh! A little baby.",
      "translation": "嘘，小宝宝来啦。",
      "target": "Baby!",
      "meaning": "宝宝！",
      "coach": "小宝宝在打瞌睡。轻轻说说宝宝的英语，让它知道派对开始啦。",
      "tip": "小宝宝在打瞌睡。轻轻说说宝宝的英语，让它知道派对开始啦。",
      "effect": "family",
      "success": "宝宝伸伸小手，摇摇晃晃地笑起来。",
      "moment": {
        "type": "family-rock",
        "focus": "baby"
      },
      "praise": "Amazing!",
      "holdMs": 3600
    },
    {
      "id": "f-grandma",
      "act": 1,
      "world": "family-garden",
      "kind": "say",
      "title": "请奶奶讲个花园故事",
      "npc": "Grandma has a story.",
      "translation": "奶奶有一个故事。",
      "target": "Grandma!",
      "meaning": "奶奶或外婆！",
      "coach": "花园里有一本大故事书。说说奶奶的英语，请她翻开看看。",
      "tip": "花园里有一本大故事书。说说奶奶的英语，请她翻开看看。",
      "effect": "family",
      "success": "奶奶翻开故事书，花丛里飞出小小的蝴蝶。",
      "moment": {
        "type": "family-story",
        "focus": "grandma"
      },
      "praise": "Cool!",
      "holdMs": 3600
    },
    {
      "id": "f-grandpa",
      "act": 1,
      "world": "family-garden",
      "kind": "say",
      "title": "和爷爷放飞气球",
      "npc": "Grandpa has a surprise.",
      "translation": "爷爷有一个惊喜。",
      "target": "Grandpa!",
      "meaning": "爷爷或外公！",
      "coach": "爷爷藏了一串气球。说说爷爷的英语，请他把气球放飞吧。",
      "tip": "爷爷藏了一串气球。说说爷爷的英语，请他把气球放飞吧。",
      "effect": "family",
      "success": "爷爷笑了，花园里升起好多爱心气球。",
      "moment": {
        "type": "family-balloon",
        "focus": "grandpa"
      },
      "praise": "Good!",
      "holdMs": 3600
    },
    {
      "id": "f-baby-bubbles",
      "act": 1,
      "world": "family-garden",
      "kind": "say",
      "title": "陪宝宝追彩虹泡泡",
      "npc": "Baby loves bubbles.",
      "translation": "宝宝喜欢泡泡。",
      "target": "Baby!",
      "meaning": "宝宝！",
      "coach": "再叫一次宝宝的英语，陪它追彩虹泡泡。",
      "tip": "再叫一次宝宝的英语，陪它追彩虹泡泡。",
      "effect": "family",
      "success": "宝宝伸手追泡泡，家人都开心地笑啦。",
      "moment": {
        "type": "family-bubbles",
        "focus": "baby"
      },
      "praise": "Great job!",
      "holdMs": 3600
    },
    {
      "id": "f-daddy-picnic",
      "act": 1,
      "world": "family-garden",
      "kind": "say",
      "title": "请爸爸摆好野餐",
      "npc": "Daddy, join our picnic.",
      "translation": "爸爸，来一起野餐。",
      "target": "Daddy!",
      "meaning": "爸爸！",
      "coach": "野餐篮还没打开。说说爸爸的英语，请爸爸帮大家准备野餐。",
      "tip": "野餐篮还没打开。说说爸爸的英语，请爸爸帮大家准备野餐。",
      "effect": "family",
      "success": "爸爸打开野餐篮，小点心飞到家人身边。",
      "moment": {
        "type": "family-picnic",
        "focus": "daddy"
      },
      "praise": "Well done!",
      "holdMs": 3600
    },
    {
      "id": "f-family",
      "act": 1,
      "world": "family-garden",
      "kind": "say",
      "title": "让一家人手拉手",
      "npc": "We are a family.",
      "translation": "我们是一家人。",
      "target": "Family!",
      "meaning": "家人、一家人！",
      "coach": "说说一家人的英语，请家人们站在一起。",
      "tip": "说说一家人的英语，请家人们站在一起。",
      "effect": "family",
      "success": "一家人围到团团身边，爱心花朵开了。",
      "moment": {
        "type": "family-together",
        "focus": "family"
      },
      "praise": "Amazing!",
      "holdMs": 3600
    },
    {
      "id": "f-photo-mommy",
      "act": 2,
      "world": "family-photo",
      "kind": "say",
      "title": "请妈妈站到全家福里",
      "npc": "Mommy, photo time!",
      "translation": "妈妈，拍照啦！",
      "target": "Mommy!",
      "meaning": "妈妈！",
      "coach": "叫一声妈妈的英语，请她站到团团身边。",
      "tip": "叫一声妈妈的英语，请她站到团团身边。",
      "effect": "family",
      "success": "妈妈站好啦，相框里点亮一颗温暖的小爱心。",
      "moment": {
        "type": "family-photo-call",
        "focus": "mommy"
      },
      "praise": "Cool!",
      "holdMs": 4300
    },
    {
      "id": "f-photo-grandpa",
      "act": 2,
      "world": "family-photo",
      "kind": "say",
      "title": "把爷爷介绍给艾莎",
      "npc": "Who is this?",
      "translation": "这是谁？",
      "target": "This is my grandpa.",
      "meaning": "这是我的爷爷或外公。",
      "coach": "跟艾莎说这是我的爷爷，请他来一起拍照。",
      "tip": "跟艾莎说这是我的爷爷，请他来一起拍照。",
      "effect": "family",
      "success": "爷爷来到团团身边，大家准备好拍照啦。",
      "moment": {
        "type": "family-grandpa-join",
        "focus": "grandpa"
      },
      "praise": "Good!",
      "holdMs": 4300
    },
    {
      "id": "f-photo-family",
      "act": 2,
      "world": "family-photo",
      "kind": "say",
      "title": "用声音拍一张全家福",
      "npc": "Family, smile together!",
      "translation": "一家人，一起笑！",
      "target": "Family!",
      "meaning": "一家人！",
      "coach": "大家站好啦。说说一家人的英语，用声音按下星星相机。",
      "tip": "大家站好啦。说说一家人的英语，用声音按下星星相机。",
      "effect": "family",
      "success": "咔嚓！你拍下了一张亮晶晶的全家福。",
      "moment": {
        "type": "family-photo",
        "focus": "family"
      },
      "praise": "Great job!",
      "holdMs": 4300
    },
    {
      "id": "f-love",
      "act": 2,
      "world": "family-photo",
      "kind": "say",
      "title": "把爱送给每一个家人",
      "npc": "I love my family.",
      "translation": "我爱我的家人。",
      "target": "I love my family.",
      "meaning": "我爱我的家人。",
      "coach": "全家福收好啦。跟团团说一句，把大大的爱送给家人。",
      "tip": "全家福收好啦。跟团团说一句，把大大的爱送给家人。",
      "effect": "family",
      "success": "一颗大爱心抱住全家。谢谢你带来这么温暖的派对！",
      "moment": {
        "type": "family-love",
        "focus": "family"
      },
      "praise": "Well done!",
      "holdMs": 3600
    }
  ]
};

/** 已实装的关卡（选关界面按此渲染）。 */
export const LEVELS: LevelConfig[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_7];

/** 后续关卡路线图：按 Big Fun 1 剩余单元排期，内容随美术资源逐关补充。 */
export const ROADMAP: { level: number; title: string; subtitle: string; unit: UnitRef }[] = [
  { level: 8, title: '艾莎的野餐厨房', subtitle: '食物和饮料 · My Lunch', unit: 'BF1-U5' },
  { level: 9, title: '冰雪魔法教室', subtitle: '教室里的小伙伴 · My Class', unit: 'BF1-U1' },
];

export const normalize = (text: string) => text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();

export function acceptsText(step: Step, text: string): boolean {
  const value = normalize(text);
  if (step.matcher === 'name') return /^(my name is|im|i am) [a-z][a-z -]{0,35}$/.test(value);
  if (step.matcher === 'like') return /^i like (apples?|bananas?|pears?|cats?|dogs?|[a-z]+(?: [a-z]+)?)$/.test(value);
  const aliases: Record<string, string[]> = { hello: ['hello', 'hi'], go: ['lets go', 'let us go'], welcome: ['youre welcome', 'you are welcome'] };
  return (aliases[step.id] ?? [normalize(step.target ?? '')]).includes(value);
}


/** Audio keys preserve Chinese coach lines as well as the existing English manifest keys. */
export const audioKey = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
