import type { LevelConfig, Step, ThemeMoment, WelcomeWord, World } from './level';

function greet(id: string, act: number, world: World, type: ThemeMoment['type'], focus: WelcomeWord,
  title: string, npc: string, translation: string, target: string, meaning: string, coach: string, success: string, praise = 'Good!'): Step {
  return { id, act, world, kind: 'say', title, npc, translation, target, meaning, coach, tip: coach,
    success, praise, effect: 'welcome', moment: { type, focus }, holdMs: 4800, ...(id === 'w-name' ? { matcher: 'name' as const } : {}) };
}

/** One social theme for the first outing; it is an introductory story, not a full textbook unit. */
export const LEVEL_1: LevelConfig = {
  id: 1, title: '艾莎的新朋友', theme: 'welcome', spells: false, units: ['welcome'],
  intro: { heading: '说声 Hello，<br>和艾莎交个新朋友！',
    description: '认识雪宝，礼貌地打开城堡大门，再邀请小猫头鹰参加欢迎派对。每一句温暖的话，都能带来一个小惊喜。' },
  starStepIds: ['w-gift', 'w-welcome', 'w-goodbye'],
  acts: [
    { title: '认识雪宝', subtitle: 'Hello, new friend!', icon: 'heart', world: 'welcome-glade', unit: 'welcome' },
    { title: '拜访冰雪城堡', subtitle: 'Please and thank you', icon: 'door', world: 'welcome-palace', unit: 'welcome' },
    { title: '新朋友欢迎派对', subtitle: 'Kind words make magic', icon: 'sparkles', world: 'welcome-party', unit: 'welcome' },
  ],
  steps: [
    greet('w-hello', 0, 'welcome-glade', 'welcome-wave', 'hello', '和雪宝打招呼', 'Hello!', '你好！', 'Hello!', '你好！',
      '雪宝向你挥手啦。跟艾莎说一声你好吧。', '雪宝摇摇小手，雪花也跳起舞啦！'),
    greet('w-name', 0, 'welcome-glade', 'welcome-name', 'name', '告诉雪宝你的名字', "What's your name?", '你叫什么名字？', 'My name is Leo.', '我的名字是 Leo。',
      '跟艾莎说自己的名字，Leo 可以换成你的名字。', '欢迎圈亮起来！雪宝很开心认识新朋友。', 'Great job!'),
    greet('w-go', 0, 'welcome-glade', 'welcome-depart', 'go', '邀请雪宝一起出发', "Let's go!", '一起出发吧！', "Let's go!", '一起出发吧！',
      '邀请雪宝一起走，看看小雪球会滚向哪里。', '小雪球排成一条路，雪宝跟着你出发啦！', 'Well done!'),
    greet('w-gift', 0, 'welcome-glade', 'welcome-gift', 'thanks', '谢谢雪宝的小礼物', 'This is for you!', '这是送给你的！', 'Thank you!', '谢谢你！',
      '雪宝送来小礼物。跟艾莎说一句谢谢吧。', '礼物里飞出爱心气球，第一颗友情星光亮啦！', 'Amazing!'),
    greet('w-knock', 1, 'welcome-palace', 'welcome-knock', 'hello', '向城堡打个招呼', 'Hello!', '你好！', 'Hello!', '你好！',
      '城堡门还关着。说声你好，让门知道你来啦。', '门上的小星星亮了，好像在和你打招呼。'),
    greet('w-please', 1, 'welcome-palace', 'welcome-door', 'please', '礼貌地请大门打开', 'Say please.', '说一句请。', 'Please!', '请！',
      '跟艾莎说一句请，看看大门会不会打开。', '大门轻轻打开啦，礼貌的话也是小魔法！', 'You did it!'),
    greet('w-thanks', 1, 'welcome-palace', 'welcome-lantern', 'thanks', '谢谢城堡的小灯', 'Here is a little light.', '这是一盏小灯。', 'Thank you!', '谢谢你！',
      '城堡送来一盏小灯。说声谢谢，点亮它吧。', '小灯暖暖地亮起，雪宝的影子摇了摇。', 'Great job!'),
    greet('w-welcome', 1, 'welcome-palace', 'welcome-bow', 'welcome', '给雪宝一个温暖的回答', 'Thank you!', '谢谢你！', "You're welcome!", '不客气！',
      '雪宝在谢谢你。跟艾莎回答一句不客气。', '雪宝鞠了个躬，第二颗友情星光亮啦！', 'Well done!'),
    greet('w-owl-hello', 2, 'welcome-party', 'welcome-owl-peek', 'hello', '叫小猫头鹰出来玩', 'Hello!', '你好！', 'Hello!', '你好！',
      '小猫头鹰藏起来啦。说声你好，请它探出头。', '躲猫猫！小猫头鹰从小球后面探出来啦。'),
    greet('w-owl-please', 2, 'welcome-party', 'welcome-owl-fly', 'please', '邀请猫头鹰来到身边', 'Say please.', '说一句请。', 'Please!', '请！',
      '说一句请，邀请小猫头鹰飞来参加派对。', '小猫头鹰绕了一圈，落到雪宝身边啦！', 'Cool!'),
    greet('w-owl-thanks', 2, 'welcome-party', 'welcome-snowflake', 'thanks', '谢谢猫头鹰的雪花', 'A snowflake for you!', '送你一片雪花！', 'Thank you!', '谢谢你！',
      '小猫头鹰送你雪花。跟艾莎说一句谢谢。', '雪花变成亮亮的小星星，绕着朋友们飞！', 'Amazing!'),
    greet('w-hug', 2, 'welcome-party', 'welcome-hug', 'welcome', '接受朋友的感谢', 'Thank you, my friend!', '谢谢你，我的朋友！', "You're welcome!", '不客气！',
      '朋友们在谢谢你。说声不客气，送出暖暖的抱抱。', '雪宝和猫头鹰靠在一起，大家都是好朋友啦！', 'Great job!'),
    greet('w-goodbye', 2, 'welcome-party', 'welcome-goodbye', 'goodbye', '和新朋友挥手道别', 'Goodbye!', '再见！', 'Goodbye!', '再见！',
      '派对结束啦。跟艾莎说再见，留下朋友合影吧。', '朋友们挥挥手，合影亮起来。我们下次再一起玩！', 'You did it!'),
  ],
};
