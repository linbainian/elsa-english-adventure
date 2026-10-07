import type { Effect, Step } from './level';

/** Celebrate participation and the action in the world, without judging pronunciation. */
const FEEDBACK: Record<Effect, { praise: string; translation: string; icon: string; result: string }> = {
  greet: { praise: 'Good!', translation: '勇敢开口，真棒！', icon: 'heart', result: '雪宝开心地和你打招呼！' },
  friend: { praise: 'Great job!', translation: '做得真棒！', icon: 'ice', result: '雪宝为你欢呼，继续一起冒险！' },
  fruit: { praise: 'Well done!', translation: '太棒啦！', icon: 'apple', result: '水果飞进野餐篮啦！' },
  door: { praise: 'You did it!', translation: '你做到了！', icon: 'door', result: '你的声音打开了魔法门！' },
  jump: { praise: 'Nice jump!', translation: '漂亮的一跳！', icon: 'jump', result: '跳过去啦！你的声音让角色动起来！' },
  walk: { praise: 'Great job!', translation: '做得真棒！', icon: 'arrow', result: '顺利过桥！雪宝在前面等你！' },
  fire: { praise: 'Amazing!', translation: '真厉害！', icon: 'fire', result: '暖暖的星星飞过去啦！' },
  ice: { praise: 'Cool!', translation: '好酷的魔法！', icon: 'ice', result: '冰晶闪亮！冰魔法生效啦！' },
  shield: { praise: 'Great job!', translation: '做得真棒！', icon: 'shield', result: '护盾升起！你保护了小伙伴！' },
  crystal: { praise: 'Well done!', translation: '太棒啦！', icon: 'sparkles', result: '红色水晶被你的声音点亮了！' },
  rescue: { praise: 'You did it!', translation: '你做到了！', icon: 'flag', result: '森林亮起来了，你是小英雄！' },
  body: { praise: 'Good!', translation: '勇敢开口，真棒！', icon: 'sparkles', result: '团团的身体魔法动起来啦！' },
  family: { praise: 'Great job!', translation: '做得真棒！', icon: 'heart', result: '家人收到你的声音啦！' },
  toys: { praise: 'Good!', translation: '勇敢开口，真棒！', icon: 'sparkles', result: '玩具们回应你的声音啦！' },
  clothes: { praise: 'Good!', translation: '勇敢开口，真棒！', icon: 'heart', result: '艾莎换上你搭配的新衣服啦！' },
  animals: { praise: 'Good!', translation: '勇敢开口，真棒！', icon: 'heart', result: '动物朋友回应你的声音啦！' },
  welcome: { praise: 'Good!', translation: '温暖的话带来小惊喜！', icon: 'heart', result: '新朋友回应你的声音啦！' },
  community: { praise: 'Good!', translation: '你让小镇热闹起来啦！', icon: 'star', result: '职业伙伴的小本领动起来啦！' },
};

export function feedbackFor(step: Step) {
  const feedback = FEEDBACK[step.effect];
  if (step.moment) return { ...feedback, praise: step.praise ?? feedback.praise, result: step.success };
  if (step.id === 'like') return { ...feedback, icon: 'star', result: '第一颗森林星光亮起来啦！' };
  if (step.id === 'thanks') return { ...feedback, icon: 'star', result: '第二颗森林星光亮起来啦！' };
  if (step.id === 'boss-shield') return { ...feedback, result: '三颗星光全部找回！小伙伴得救啦！' };
  return feedback;
}
