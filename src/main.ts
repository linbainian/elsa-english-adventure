import Phaser from 'phaser';
import { Adventure } from './game/Adventure';
import type { InputMode } from './game/Adventure';
import { UNITS, LEVELS, ROADMAP } from './game/level';
import type { UnitRef } from './game/level';
import { SnowScene } from './game/SnowScene';
import { elsaPortrait } from './game/ElsaLooks';
import { feedbackFor } from './game/feedback';
import { VoiceInput } from './speech/VoiceInput';
import { Narrator } from './speech/Narrator';
import { SoundBank } from './speech/SoundBank';
import { icon, escapeHtml } from './ui/icons';
import './style.css';
import './snow.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const adventure = new Adventure();
const voice = new VoiceInput();
const narrator = new Narrator();
const sounds = new SoundBank();
const scene = new SnowScene(adventure);
let loaded = false;
let listening = false;
let speaking = false;
let hint = false;
let muted = false;
let readyToContinue = false;
let microphoneReady = false;
let voiceDetected = false;
let responding = false;
let handingOver = false;
let narratedText = '';
let cueMarkup = '';
let rewardVisible = false;
let successTimer: ReturnType<typeof setTimeout> | undefined;
let narrationTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let autoVoiceTimer: ReturnType<typeof setTimeout> | undefined;
let autoContinueTimer: ReturnType<typeof setTimeout> | undefined;
let inputGeneration = 0;
let speechGeneration = 0;
let turnGeneration = 0;
let runStarted = 0;
let elapsedSeconds = 0;
let animalFriends: string[] = [];
let communityFriends: string[] = [];
const elsaGuide = () => Boolean(adventure.level.theme);
const starName = () => adventure.level.theme === 'community' ? '帮忙星光' : adventure.level.theme === 'welcome' ? '友情星光'
  : adventure.level.theme === 'animals' ? '动物星光' : adventure.level.theme === 'clothes' ? '装扮星光' : '冒险星光';
const curriculumLabel = () => adventure.level.units.map(ref => ref === 'welcome' ? '新手情景 · 问候与礼貌'
  : `参考 ${UNITS[ref].bigFun} · ${UNITS[ref].unit} ${UNITS[ref].title} · 原创改编`).join(' / ');

const modeLabels: Record<InputMode, string> = { voice: '全程声音魔法', read: '我读好了', type: '键盘练习' };
const iconForMode: Record<InputMode, string> = { voice: 'mic', read: 'check', type: 'keyboard' };
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

app.innerHTML = `
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="冰雪奇遇首页"><span class="brand-mark">${icon('ice')}</span><span class="brand-copy">艾莎的冰雪奇遇<small>A LITTLE VOICE. A LITTLE MAGIC.</small></span></a>
      <div class="topbar-actions">
        <span class="voice-pill"><i></i> 让声音变成魔法</span>
        <button class="nav-button book-button" data-action="book">${icon('book')} <span>冒险手册</span></button>
        <span class="nav-divider"></span>
        <button id="mute-button" class="icon-button" data-action="mute" title="关闭声音" aria-label="关闭声音" aria-pressed="false">${icon('volume')}</button>
        <button class="icon-button" data-action="settings" title="冒险设置" aria-label="冒险设置">${icon('settings')}</button>
        <button class="icon-button" data-action="fullscreen" title="全屏冒险" aria-label="全屏冒险">${icon('fullscreen')}</button>
      </div>
    </header>

    <main>
      <section class="chapter-heading">
        <div><div class="eyebrow">CHAPTER ONE <span></span> YOUR FIRST ADVENTURE</div><h1>冰雪奇遇 <span class="level-badge">LEVEL 01</span></h1><p>和雪宝一起，把小小的英语变成大大的魔法。</p></div>
        <div class="chapter-meta"><span>${icon('clock')} 约 5–8 分钟</span><span>${icon('leaf')} 初次冒险</span></div>
      </section>

      <div class="adventure-layout">
        <div class="main-column">
          <nav class="journey" aria-label="冒险路线" id="journey"></nav>
          <section class="world-card" aria-label="冰雪公主的魔法冒险场景">
            <div id="game-frame" class="game-frame">
              <div id="game-canvas"></div>
              <div class="world-top"><span id="location-label" class="location-label">${icon('leaf')} 雪花小径</span><span class="world-stars">${icon('star')} <strong id="star-count">0</strong><span>勇气星</span></span></div>
              <div id="animal-friends" class="animal-friends" hidden aria-label="认识动物朋友的进度"></div>
              <div id="intro-overlay" class="intro-overlay">
                <div class="intro-copy"><span class="intro-kicker">ELSA'S SNOWY ADVENTURE</span><h2>和冰雪公主<br>一起<span>变魔法！</span></h2><p>说声 Hello，和雪宝交朋友。<br>开口读一读，雪花就会跳起舞。</p><button class="primary-button start-button" data-action="start" disabled>雪花正在准备… ${icon('sparkles')}</button><span class="intro-note">${icon('mic')} 家长点一次开始，之后小朋友只需要说话</span></div>
              </div>
              <div id="travel-overlay" class="travel-overlay" hidden aria-hidden="true"><span class="travel-snowflake">${icon('ice')}</span><strong id="travel-title"></strong><span>坐上雪花，出发啦！</span></div>
              <div id="play-cue" class="play-cue" role="status" aria-live="polite" aria-atomic="true" hidden></div>
              <div id="spell-slots" class="spell-slots" aria-label="已学会的魔法"></div>
              <div id="world-toast" class="world-toast" role="status" aria-live="polite"></div>
              <div id="complete-overlay" class="complete-overlay" hidden></div>
            </div>
            <div class="world-controls"><div><span>${icon('mic')} 跟读英语，自动施法</span><span>${icon('heart')} 进入冒险后，不用碰电脑</span></div><button class="text-button" data-action="pause" id="pause-button">${icon('pause')} 暂停一下</button></div>
          </section>
        </div>

        <aside class="quest-column">
          <section id="quest-panel" class="quest-panel" aria-label="当前冒险任务"></section>
          <section id="dialogue" class="dialogue-card" aria-label="伙伴对话"></section>
          <section class="discovery-card"><div class="discovery-icon">${icon('sparkles')}</div><div><h3>找回森林的星光</h3><p>用声音采水果、打开门、救伙伴，<br>三颗森林星光就会重新亮起来。</p><div class="discovery-count" id="discovery-count"><i></i><i></i><i></i><span>0 / 3 已点亮</span></div></div></section>
          <p class="gentle-note">${icon('heart')} 没有倒计时，也没有发音分数。<br>按照自己的节奏，慢慢冒险。</p>
        </aside>
      </div>
    </main>
    <footer class="page-footer"><span>${icon('leaf')} 每一个词，都是通往新世界的钥匙。</span><span>A LITTLE COURAGE. A LITTLE MAGIC.</span></footer>
  </div>
  <dialog id="modal" class="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>
`;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: 1280,
  height: 720,
  backgroundColor: '#e5ecff',
  scene: [scene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  audio: { noAudio: true },
  input: { keyboard: { capture: [] } },
});

function refreshStageSize() {
  if (!loaded) return;
  game.scale.getParentBounds();
  game.scale.refresh();
}
const frameResize = new ResizeObserver(refreshStageSize);
frameResize.observe($('#game-frame'));

function showToast(message: string) {
  clearTimeout(toastTimer);
  const toast = $('#world-toast');
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
}

function stopInput() {
  inputGeneration += 1;
  speechGeneration += 1;
  turnGeneration += 1;
  voice.stop();
  scene.listening(false);
  narrator.stop();
  listening = false;
  speaking = false;
  microphoneReady = false;
  voiceDetected = false;
  responding = false;
  handingOver = false;
  narratedText = '';
  clearTimeout(successTimer);
  clearTimeout(narrationTimer);
  clearTimeout(autoVoiceTimer);
  clearTimeout(autoContinueTimer);
}

function renderPlayCue() {
  const state = adventure.state;
  const cue = $('#play-cue');
  const frame = $('#game-frame');
  if (['intro', 'complete'].includes(state.phase) || state.paused || scene.isTransitioning) {
    cue.hidden = true;
    frame.dataset.turn = '';
    frame.classList.remove('voice-detected');
    cueMarkup = '';
    return;
  }
  const step = adventure.step;
  const success = state.phase === 'celebrating' && rewardVisible;
  const feedback = feedbackFor(step);
  const magic = responding || state.phase === 'celebrating' && !rewardVisible;
  const tone = success ? 'success' : magic ? 'magic' : listening && microphoneReady ? 'speak' : speaking && !handingOver ? 'listen' : 'ready';
  const stage = success || magic ? 2 : tone === 'speak' || handingOver ? 1 : 0;
  const label = success ? feedback.translation : magic ? '看，艾莎变魔法啦！' : tone === 'speak' ? '轮到你说啦！' : tone === 'listen' ? step.moment ? '听艾莎读一读' : '听雪宝读一读' : state.mode === 'voice' ? '准备好，马上轮到你' : '读出来，施展魔法';
  const phrase = success ? feedback.praise : tone === 'listen' && narratedText !== step.coach ? narratedText || step.target : step.target;
  const helper = success ? feedback.result : magic ? '小小声音，变出大大魔法。' : tone === 'speak' ? voiceDetected ? '听到你啦！' : step.moment ? step.title : '跟着读出来就好。' : tone === 'listen' ? step.moment ? step.title : '仔细听，接下来换你。' : state.mode === 'voice' ? '不用点，麦克风自己会亮。' : '按自己的节奏，大胆开口。';
  const markup = `<div class="cue-heading"><span class="cue-symbol">${icon(success ? feedback.icon : responding ? 'sparkles' : tone === 'speak' ? 'mic' : 'volume')}</span><span>${label}</span>${success ? `<span class="cue-reward">${icon('star')} +1</span>` : ''}</div><strong class="cue-phrase" lang="en">${escapeHtml(phrase ?? '')}</strong><p class="cue-helper">${escapeHtml(helper)}</p><div class="cue-turns" aria-hidden="true">${['听一听', '说出来', '魔法生效'].map((text, i) => `<span class="${i === stage ? 'active' : i < stage ? 'done' : ''}"><i>${i < stage ? icon('check') : i + 1}</i>${text}</span>`).join('<b>›</b>')}</div>`;
  const key = step.id + tone + markup;
  if (cueMarkup !== key) { cue.innerHTML = markup; cueMarkup = key; }
  cue.hidden = false;
  cue.dataset.tone = tone;
  frame.dataset.turn = tone;
  frame.classList.toggle('voice-detected', voiceDetected && listening);
}

function renderJourney() {
  const state = adventure.state;
  const act = state.phase === 'intro' ? 0 : adventure.step.act;
  $('#journey').innerHTML = adventure.level.acts.map((item, index) => {
    const done = state.phase === 'complete' || index < act;
    return `<div class="journey-stop ${index === act && state.phase !== 'complete' ? 'current' : ''} ${done ? 'done' : ''}" ${index === act ? 'aria-current="step"' : ''}><span class="journey-symbol">${done ? icon('check') : icon(item.icon)}</span><span>${item.title}</span><span class="journey-line"></span></div>`;
  }).join('');
}

function renderHUD() {
  $('#star-count').textContent = String(adventure.state.stars);
  $('#location-label').innerHTML = `${icon('leaf')} ${adventure.state.phase === 'intro' ? adventure.level.title : adventure.state.phase === 'complete' ? adventure.level.theme === 'community' ? '星光感谢派对' : adventure.level.theme === 'welcome' ? '新朋友欢迎派对' : adventure.level.theme === 'toys' ? '玩具大游行' : adventure.level.theme === 'clothes' ? '魔法装扮舞会' : adventure.level.theme === 'animals' ? '动物朋友的月光派对' : '星光回来了' : adventure.act.title}`;
  $('#spell-slots').innerHTML = adventure.level.spells ? ['fire', 'ice', 'shield'].map((spell, i) => {
    const learned = ['learn-fire', 'learn-ice', 'learn-shield'];
    return `<div class="spell-slot ${adventure.state.completed.includes(learned[i]!) ? 'unlocked' : ''}" title="${adventure.state.completed.includes(learned[i]!) ? '已学会' : '前往魔法练习场解锁'}"><span>${icon(spell)}</span><div>${['Fire', 'Ice', 'Shield'][i]}<small>${adventure.state.completed.includes(learned[i]!) ? '已学会' : '待解锁'}</small></div></div>`;
  }).join('') : '';
  const found = adventure.state.collected;
  $('#discovery-count').innerHTML = [0, 1, 2].map(i => `<i class="${i < found ? 'found' : ''}">${i < found ? icon('star') : ''}</i>`).join('') + `<span>${found} / 3 已点亮</span>`;
  renderAnimalFriends();
}

function renderAnimalFriends() {
  const badge = $('#animal-friends');
  const community = adventure.level.theme === 'community';
  badge.hidden = adventure.level.theme !== 'animals' && !community;
  if (badge.hidden) return;
  const animals = community ? ['bus-driver', 'firefighter', 'police-officer', 'doctor', 'nurse', 'dentist'] : ['cat', 'dog', 'rabbit', 'bird', 'duck', 'fish'];
  const names = community ? ['巴士司机', '消防员', '警察', '医生', '护士', '牙医'] : ['小猫', '小狗', '兔子', '小鸟', '鸭子', '小鱼'];
  const friends = community ? communityFriends : animalFriends;
  badge.classList.toggle('community-friends', community);
  badge.setAttribute('aria-label', `已经认识 ${friends.length} 位${community ? '小镇伙伴' : '动物朋友'}，共 6 位`);
  const markup = animals.map((animal, i) => `<span class="animal-friend ${friends.includes(animal) ? 'met' : ''}" title="${names[i]}"><img src="/assets/${community ? 'community/face-' : 'animals/'}${animal}.png" alt="${names[i]}${friends.includes(animal) ? '，已认识' : ''}" /></span>`).join('');
  if (badge.innerHTML !== markup) badge.innerHTML = markup;
}

function renderDialogue() {
  const state = adventure.state;
  const step = adventure.step;
  const owl = step.world === 'cleared' && state.phase !== 'intro';
  const toys = adventure.level.theme === 'toys';
  const clothes = adventure.level.theme === 'clothes';
  const animals = adventure.level.theme === 'animals';
  const community = adventure.level.theme === 'community';
  const welcome = adventure.level.theme === 'welcome';
  const text = state.phase === 'intro' ? 'Hello, little adventurer!' : state.phase === 'complete' ? toys || elsaGuide() ? 'You did it!' : 'You brought the magic back!' : state.phase === 'celebrating' ? rewardVisible ? feedbackFor(step).praise : 'A little magic…' : step.npc;
  const translation = state.phase === 'intro' ? community ? '和艾莎一起，认识六位小镇伙伴！' : welcome ? '说句温暖的话，认识一个新朋友吧！' : animals ? '跟艾莎一起，照顾六个动物新朋友吧！' : clothes ? '艾莎的舞会衣服，就交给你来搭配啦！' : toys ? '你好，小小冒险家！玩具们在等你。' : '你好，小小冒险家！伙伴们在等你。' : state.phase === 'complete' ? community ? '谢谢你，小小帮帮员！' : welcome ? '下次再和新朋友一起玩！' : animals ? '谢谢你，小小动物好朋友！' : clothes ? '谢谢你，小小魔法造型师！' : toys ? '玩具们都来参加你的游行啦！' : '伙伴们都为你欢呼！' : state.phase === 'celebrating' ? rewardVisible ? `${feedbackFor(step).translation} ${step.success}` : '看看艾莎变出了什么。' : step.translation;
  const concealed = state.phase === 'playing' && step.kind !== 'say' && !hint && state.mode !== 'voice';
  const portrait = elsaGuide() ? elsaPortrait(step.world, state.phase === 'celebrating' && rewardVisible)
    : '/assets/snow/' + (owl ? 'owl' : 'buddy-idle') + '.png';
  $('#dialogue').innerHTML = `<span class="npc-portrait"><img class="${elsaGuide() ? 'elsa-portrait' : ''}" src="${portrait}" alt="${elsaGuide() ? '艾莎' : owl ? '小猫头鹰' : '雪宝'}" /></span><div class="npc-copy"><span class="npc-name">${elsaGuide() ? '你的伙伴 · 艾莎' : owl ? '小猫头鹰 奥利' : '你的伙伴 · 雪宝'} <i></i></span><p lang="en">${concealed ? 'Listen carefully…' : escapeHtml(text)}</p><span class="npc-translation">${concealed ? '先听一听，再用行动回答。需要帮助可以打开文字提示。' : escapeHtml(translation)}</span></div><button class="dialogue-audio ${speaking ? 'speaking' : ''}" data-action="replay" aria-label="再听一次伙伴的英语" title="再听一次">${icon('volume')}</button>`;
}

function renderQuest() {
  $('.page-shell').dataset.mode = adventure.state.mode;
  $('#game-frame').dataset.travel = String(scene.isTransitioning);
  renderPlayCue();
  const state = adventure.state;
  const step = adventure.step;
  const panel = $('#quest-panel');
  const mode = state.mode;
  if (state.phase === 'intro') {
    const savedStars = progressStars();
    const levelCards = [
      ...LEVELS.map(level => `<button class="level-option ${level.id === adventure.level.id ? 'selected' : ''}" data-action="select-level" data-level="${level.id}"><span class="level-no">${level.id}</span><div><strong>${escapeHtml(level.title)}</strong><small>${level.units.map(unit => unit === 'welcome' ? '问候与礼貌 · 新手情景' : `参考 ${UNITS[unit].bigFun} · ${UNITS[unit].unit} · 原创改编`).join(' + ')}</small></div>${savedStars[level.id] ? `<span class="level-stars">${icon('star')} ${savedStars[level.id]}</span>` : icon('chevron')}</button>`),
      ...ROADMAP.map(item => `<span class="level-option locked"><span class="level-no">${item.level}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle)} · 敬请期待</small></div></span>`),
    ].join('');
    panel.innerHTML = `<div class="panel-eyebrow">${icon('compass')} 冒险准备</div><div class="intro-fox"><img src="/assets/${adventure.level.theme === 'animals' ? 'animals/cat' : 'snow/buddy-idle'}.png" alt="${adventure.level.theme === 'animals' ? '等待出发的小猫' : '等待出发的雪宝'}"/><span>Hello!</span></div><h2>${adventure.level.intro.heading}</h2><p class="panel-description">${escapeHtml(adventure.level.intro.description)}</p><div class="level-picker"><span class="theme-label">${icon('flag')} 选择关卡 · 主题冒险</span><div class="level-options">${levelCards}</div></div><div class="theme-block"><span class="theme-label">${icon('book')} 本次冒险的英语</span><div class="vocab-chips">${adventure.level.units.flatMap(ref => UNITS[ref].vocab).slice(0, 8).map(word => `<i>${escapeHtml(word)}</i>`).join('')}</div></div><button class="mode-chip intro-mode" data-action="settings">${icon(iconForMode[mode])} ${modeLabels[mode]} ${icon('chevron')}</button>`;
    return;
  }
  if (state.phase === 'complete') {
    panel.innerHTML = `<div class="panel-eyebrow">${icon('flag')} 冒险完成</div><div class="completion-medal">${icon('star')}</div><h2>${escapeHtml(adventure.level.title)}<br>完成啦！</h2><p class="panel-description">你和${adventure.level.theme === 'welcome' ? '艾莎、雪宝' : elsaGuide() ? '艾莎、团团' : adventure.level.theme === 'toys' ? '团团' : '雪宝'}完成了「${escapeHtml(adventure.level.title)}」，这次冒险的英语都变成你的魔法了。</p><div class="summary-stat"><strong>${state.stars}</strong><span>颗勇气星</span></div><div class="summary-line">${icon('mic')} 完成了 ${adventure.steps.length} 次英语互动</div><div class="summary-line">${icon('book')} 练习了本关的主题短句</div><button class="primary-button" data-action="book">看看我的收获 ${icon('book')}</button><button class="secondary-button" data-action="restart">换个关卡 / 再玩一次 ${icon('arrow')}</button>`;
    return;
  }
  const total = adventure.steps.length;
  const progress = Math.round(state.completed.length / total * 100);
  const unit = adventure.act.unit as UnitRef | undefined;
  const unitInfo = unit === 'welcome' ? '问候与礼貌 · 新手情景' : unit ? `参考 ${UNITS[unit].bigFun} · ${UNITS[unit].unit} ${UNITS[unit].title}` : '冒险环节 · Adventure Time';
  panel.innerHTML = `<div class="quest-topline"><span class="panel-eyebrow">${icon(state.phase === 'celebrating' ? 'check' : 'flag')} ${state.phase === 'celebrating' ? '魔法生效了' : '当前任务'}</span><span class="step-number">${state.index + 1} / ${total}</span></div><div class="unit-chip">${icon('book')} ${unitInfo}</div><div class="quest-progress"><span style="width:${progress}%"></span></div><h2 class="quest-title">${escapeHtml(step.title)}</h2>${state.phase === 'celebrating' ? renderSuccess() : renderTask()}<div class="quest-tip">${icon('leaf')} <p>${escapeHtml(state.phase === 'celebrating' ? '再小的一次开口，也是一颗闪亮的勇气星。' : step.tip)}</p></div>`;
  if (scene.isTransitioning || scene.isActing) panel.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button:not([data-action="settings"]), input').forEach(control => { control.disabled = true; });
}

function renderSuccess() {
  if (!rewardVisible) return `<div class="magic-in-motion">${icon('sparkles')}<strong>看，魔法出现啦！</strong><span>和艾莎一起看看会发生什么。</span></div>`;
  const feedback = feedbackFor(adventure.step);
  const next = adventure.state.mode === 'voice' ? `<div class="auto-next">${icon(readyToContinue ? 'arrow' : 'volume')} ${readyToContinue ? adventure.state.index === adventure.steps.length - 1 ? '正在为你颁发冒险徽章…' : elsaGuide() ? '艾莎正在带你去下一站…' : '雪宝正在带你去下一站…' : elsaGuide() ? '艾莎正在为你欢呼！' : '雪宝正在为你欢呼！'}<small>冒险自动继续，不用点击</small></div>` : `<button class="primary-button continue-button" data-action="continue" ${readyToContinue ? '' : 'disabled'}>${adventure.state.index === adventure.steps.length - 1 ? '领取冒险徽章' : '继续冒险'} ${icon('arrow')}</button>`;
  return `<div class="success-emblem">${icon(feedback.icon)}</div><p class="success-praise" lang="en">${feedback.praise}</p><p class="success-title">${feedback.translation}</p><p class="success-copy">${escapeHtml(adventure.step.success)}</p><div class="star-reward">${icon('star')} +1 勇气星</div>${next}`;
}

function renderTask() {
  const step = adventure.step;
  const mode = adventure.state.mode;
  if (step.kind === 'say' || mode === 'voice') {
    const task = `<div class="target-label">SAY IT OUT LOUD <span>大胆说出来</span></div><div class="target-phrase" lang="en">${escapeHtml(step.target ?? '')}</div><p class="target-meaning">${escapeHtml(step.meaning ?? '')}</p><div class="practice-actions"><button class="text-button" data-action="example">${icon('volume')} 听示范</button><button class="text-button" data-action="slow">${icon('clock')} 慢一点</button></div>`;
    let input = '';
    if (mode === 'voice') input = `<div id="talk-button" class="talk-button ${listening ? 'listening' : ''}" aria-label="自动跟读状态"><span class="mic-ring">${icon(responding ? 'sparkles' : 'mic')}</span><strong>${responding ? '听到了！魔法来了！' : listening ? '轮到你说啦…' : handingOver ? '准备好，轮到你…' : speaking ? elsaGuide() ? '先听艾莎说…' : '先听雪宝说…' : '魔法正在准备…'}</strong><span>${listening ? '读完稍停一下，魔法就会出现' : '麦克风会自动接力，不用点击'}</span></div><div class="voice-meter" aria-hidden="true">${Array.from({ length: 19 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><span id="voice-status" class="voice-status">${responding ? '你的声音正在变成游戏里的动作！' : listening ? '麦克风准备中…' : '只要勇敢开口，不给发音打分'}</span>`;
    else if (mode === 'read') input = `<div class="read-mode-note">先听示范，再把短句读出来。</div><button class="primary-button read-button" data-action="read">${icon('check')} 我读好了，施展魔法！</button>`;
    else input = `<form id="typing-form" class="typing-form"><label for="answer-input">把这句英语打出来</label><input id="answer-input" type="text" lang="en" placeholder="${escapeHtml(step.target ?? '')}" autocomplete="off" spellcheck="false" maxlength="70" aria-describedby="typing-help"/><span id="typing-help">名字和喜欢的东西可以换成自己的。</span><button class="primary-button" type="submit">施展魔法 ${icon('sparkles')}</button></form>`;
    return `${task}${input}<button class="mode-chip" data-action="settings">${icon(iconForMode[mode])} ${modeLabels[mode]} ${icon('chevron')}</button>`;
  }
  if (step.kind === 'choose') return `<div class="listen-instruction"><span class="listen-disc">${icon('volume')}</span><strong>听一听，再找一找</strong><p>${hint ? escapeHtml(step.npc) : '答案藏在雪宝的声音里'}</p><button class="secondary-button" data-action="replay">${icon('volume')} 再听一次</button><button class="text-button hint-button" data-action="hint">${icon('help')} ${hint ? '收起文字提示' : '看看文字提示'}</button></div><div class="choice-buttons" role="group" aria-label="选择场景里的物品">${step.choices?.map((choice, i) => `<button data-action="choice" data-choice="${choice.id}" class="choice-button" aria-label="选择${escapeHtml(choice.label)}">${choice.asset ? `<img src="/assets/snow/${choice.asset}.png" alt="${escapeHtml(choice.label)}" />` : `<span class="choice-gem" style="--gem:${choice.color}">${icon('sparkles')}</span>`}<kbd>${i + 1}</kbd></button>`).join('')}</div><p class="choice-note">点击画面中的物品也可以选择</p>`;
  const jump = step.action === 'jump';
  return `<div class="listen-instruction"><span class="listen-disc">${icon(jump ? 'jump' : 'arrow')}</span><strong>听懂指令，用行动回答</strong><p>${hint ? escapeHtml(step.npc) : '准备好了吗？听听雪宝的指令。'}</p><button class="secondary-button" data-action="replay">${icon('volume')} 再听一次</button><button class="text-button hint-button" data-action="hint">${icon('help')} ${hint ? '收起文字提示' : '看看文字提示'}</button></div><button class="primary-button action-button" data-action="${jump ? 'jump' : 'right'}">${icon(jump ? 'jump' : 'arrow')} ${jump ? '跳一下' : '向右走'}</button><p class="choice-note">也可以按 <kbd>${jump ? 'Space' : '→ / D'}</kbd></p>`;
}

function renderComplete() {
  const overlay = $('#complete-overlay');
  const complete = adventure.state.phase === 'complete';
  overlay.hidden = !complete;
  if (complete) overlay.innerHTML = `<div><span class="victory-kicker">YOU DID IT!</span><h2>${escapeHtml(adventure.level.title)}完成啦！</h2><p>${adventure.level.theme === 'community' ? '六位小镇伙伴都为你欢呼！谢谢你，小小帮帮员！' : adventure.level.theme === 'welcome' ? '艾莎、雪宝和猫头鹰都为你欢呼！下次再一起玩！' : adventure.level.theme === 'animals' ? '六个动物朋友都为你欢呼！谢谢你，小小动物好朋友！' : adventure.level.theme === 'clothes' ? '谢谢你帮艾莎打扮！一起跳舞吧，小小魔法造型师！' : adventure.level.theme === 'toys' ? '艾莎、团团和玩具们都为你欢呼！' : '艾莎和雪宝都为你欢呼！'}</p><span class="victory-stars">${icon('star')}${icon('star')}${icon('star')}</span><button class="primary-button" data-action="restart">换个关卡 / 再玩一次 ${icon('sparkles')}</button></div>`;
}

function progressStars(): Record<number, number> {
  try { return JSON.parse(localStorage.getItem('little-english-adventure:progress') ?? '{}') as Record<number, number>; }
  catch { return {}; }
}

function renderAll() {
  const chapterNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
  $('.chapter-heading .eyebrow').innerHTML = `CHAPTER ${chapterNames[adventure.level.id - 1]} <span></span> A LITTLE VOICE ADVENTURE`;
  $('.chapter-heading h1').innerHTML = `${escapeHtml(adventure.level.title)} <span class="level-badge">LEVEL ${String(adventure.level.id).padStart(2, '0')}</span>`;
  $('.chapter-heading p').textContent = curriculumLabel();
  $('.page-shell').dataset.mode = adventure.state.mode;
  $('.page-shell').dataset.phase = adventure.state.phase;
  $('#game-frame').dataset.phase = adventure.state.phase;
  $('#game-frame').dataset.theme = adventure.level.theme ?? 'snow';
  $('#game-frame').dataset.world = adventure.step.world;
  $('#game-frame').dataset.moment = adventure.step.moment?.type ?? '';
  const introHeading = $('#intro-overlay h2');
  introHeading.innerHTML = adventure.level.theme ? adventure.level.intro.heading : '和冰雪公主<br>一起<span>变魔法！</span>';
  $('#intro-overlay p').textContent = adventure.level.theme ? adventure.level.intro.description : '说声 Hello，和雪宝交朋友。开口读一读，雪花就会跳起舞。';
  $('#intro-overlay .intro-kicker').textContent = adventure.level.theme === 'community' ? "ELSA'S MAGIC TOWN" : adventure.level.theme === 'welcome' ? "HELLO, NEW FRIENDS!" : adventure.level.theme === 'clothes' ? "ELSA'S MAGIC WARDROBE" : adventure.level.theme === 'animals' ? "ELSA'S ANIMAL FRIENDS" : "ELSA'S SNOWY ADVENTURE";
  $('.discovery-card h3').textContent = adventure.level.theme === 'community' ? '和六位小镇伙伴一起帮忙' : adventure.level.theme === 'welcome' ? '用温暖的话交个新朋友' : adventure.level.theme === 'animals' ? '和六个动物交朋友' : adventure.level.theme === 'clothes' ? '帮艾莎搭配舞会新衣' : adventure.level.theme === 'body' ? '收集身体小魔法' : adventure.level.theme === 'family' ? '留下一张暖暖的全家福' : adventure.level.theme === 'toys' ? '举办一场玩具大游行' : '找回森林的星光';
  $('.discovery-card p').textContent = adventure.level.theme === 'community' ? '坐巴士、陪小鸭过街、照顾小熊，最后感谢小镇的伙伴。' : adventure.level.theme === 'welcome' ? '打招呼、收礼物、拜访城堡，再邀请猫头鹰参加欢迎派对。' : adventure.level.theme === 'animals' ? '叫醒、玩球、躲猫猫，飞过水塘，再到月光营地照顾新朋友。' : adventure.level.theme === 'clothes' ? '用声音换衣服、戴鞋帽，留下自己的装扮照片，再一起跳舞。' : adventure.level.theme === 'body' ? '鼻子、耳朵、小手和小脚，各有一种好玩的魔法。' : adventure.level.theme === 'family' ? '请家人来玩耍，用声音留住温暖的回忆。' : adventure.level.theme === 'toys' ? '叫醒玩具、搭好轨道，带小伙伴一起去彩虹街游行。' : '用声音采水果、打开门、救伙伴，三颗森林星光就会重新亮起来。';
  $('#intro-overlay').hidden = adventure.state.phase !== 'intro';
  $('#travel-overlay').hidden = !scene.isTransitioning;
  if (adventure.state.phase === 'intro' && loaded) {
    const startButton = $<HTMLButtonElement>('.start-button');
    startButton.disabled = false;
    startButton.innerHTML = `开启冒险 ${icon('arrow')}`;
  }
  renderJourney();
  renderHUD();
  renderDialogue();
  renderQuest();
  renderComplete();
  $('#pause-button').hidden = ['intro', 'complete'].includes(adventure.state.phase);
}

async function say(text: string, slow = false, handoff = false) {
  inputGeneration += 1;
  const generation = ++speechGeneration;
  voice.stop();
  scene.listening(false);
  listening = false;
  microphoneReady = false;
  voiceDetected = false;
  narratedText = text;
  handingOver = handoff;
  speaking = !muted;
  renderDialogue();
  renderPlayCue();
  if (adventure.state.mode === 'voice') renderQuest();
  const spoken = await narrator.say(text, slow);
  if (generation !== speechGeneration) return;
  speaking = false;
  $('.dialogue-audio')?.classList.remove('speaking');
  renderPlayCue();
  if (adventure.state.mode === 'voice') renderQuest();
  if (!spoken && !muted && adventure.state.phase === 'playing') showToast('这段录音暂时没加载成功，可以点「再听一次」重试。');
}

async function promptAndListen(options: { retry?: boolean; onlyTarget?: boolean; slow?: boolean } = {}) {
  if (adventure.state.phase !== 'playing' || adventure.state.paused || responding) return;
  stopInput();
  const stepId = adventure.step.id;
  const turn = ++turnGeneration;
  const current = () => turn === turnGeneration && adventure.step.id === stepId && adventure.state.phase === 'playing' && !adventure.state.paused;
  await scene.whenReady();
  if (!current() || scene.isActing) return;
  if (options.retry) { await say("Let's try together!"); if (!current()) return; }
  if (adventure.step.coach && !options.onlyTarget) {
    await say(adventure.step.coach);
    if (!current()) return;
  }
  const prompt = options.onlyTarget ? adventure.step.target ?? adventure.step.npc : adventure.step.npc;
  // A repeated model line needs one clear, slower recording, not two identical English turns.
  const slow = options.slow ?? Boolean(!options.onlyTarget && adventure.step.moment && prompt === adventure.step.target);
  await say(prompt, slow);
  if (!current()) return;
  if (!options.onlyTarget && adventure.state.mode === 'voice' && adventure.step.target && adventure.step.target !== adventure.step.npc) {
    await say(adventure.step.target, Boolean(adventure.step.moment));
    if (!current()) return;
  }
  if (adventure.state.mode === 'voice') {
    handingOver = true;
    sounds.ready();
    renderQuest();
    autoVoiceTimer = setTimeout(() => { if (current()) void startListening(); }, adventure.step.moment ? 650 : 150);
  }
}

async function celebrate() {
  if (adventure.state.phase !== 'celebrating' || adventure.state.paused) return;
  const stepId = adventure.step.id;
  const turn = ++turnGeneration;
  const startedAt = performance.now();
  const current = () => turn === turnGeneration && adventure.step.id === stepId && adventure.state.phase === 'celebrating' && !adventure.state.paused;
  readyToContinue = false;
  speaking = false;
  renderDialogue();
  renderQuest();
  // 表扬语立刻开口，和场景里的魔法动画并行，不让小孩干等。
  const praise = feedbackFor(adventure.step);
  const praiseAudio = muted ? Promise.resolve(false) : narrator.say(praise.praise);
  rewardVisible = true;
  speaking = !muted;
  renderDialogue();
  renderQuest();
  await scene.whenResponseReady();
  if (!current()) return;
  await praiseAudio;
  if (!current()) return;
  if (adventure.step.moment && !muted) {
    await narrator.say(adventure.step.success);
    if (!current()) return;
  }
  speaking = false;
  renderDialogue();
  // Hold the world reaction and await the actual end of the praise before advancing.
  const hold = adventure.step.holdMs ?? (adventure.state.mode === 'voice' ? 2400 : 2000);
  successTimer = setTimeout(() => {
    if (!current()) return;
    readyToContinue = true;
    renderQuest();
    $<HTMLButtonElement>('.continue-button')?.focus({ preventScroll: true });
    scheduleNext();
  }, Math.max(0, hold - (performance.now() - startedAt)));
}

function scheduleNext() {
  clearTimeout(autoContinueTimer);
  if (!readyToContinue || adventure.state.mode !== 'voice' || adventure.state.phase !== 'celebrating' || adventure.state.paused) return;
  const stepId = adventure.step.id;
  autoContinueTimer = setTimeout(() => {
    if (adventure.state.mode === 'voice' && adventure.state.phase === 'celebrating' && !adventure.state.paused && adventure.step.id === stepId) adventure.continue();
  }, 450);
}

async function beginAdventure() {
  const button = $<HTMLButtonElement>('.start-button');
  button.disabled = true;
  if (adventure.state.mode === 'voice') {
    button.innerHTML = `请允许麦克风 ${icon('mic')}`;
    try { await voice.prepare(); }
    catch {
      button.disabled = false;
      button.innerHTML = `允许麦克风，开始 ${icon('arrow')}`;
      showToast('请允许浏览器使用麦克风。也可以在冒险设置中选择无需麦克风的试玩模式。');
      return;
    }
  }
  if (adventure.state.paused) { button.disabled = false; return; }
  sounds.unlock();
  runStarted = Date.now();
  adventure.start();
}

async function startListening() {
  if (adventure.state.phase !== 'playing' || adventure.state.paused || scene.isTransitioning || scene.isActing) return;
  if (listening) { stopInput(); renderQuest(); return; }
  narrator.stop();
  speaking = false;
  handingOver = false;
  microphoneReady = false;
  voiceDetected = false;
  const stepId = adventure.step.id;
  const generation = ++inputGeneration;
  listening = true;
  scene.listening(true);
  renderDialogue();
  renderQuest();
  const meter = $('.voice-meter');
  const bars = Array.from(meter.querySelectorAll<HTMLElement>('i'));
  let gotLevel = false;
  try {
    const result = await voice.listen(level => {
      if (!listening || adventure.step.id !== stepId || generation !== inputGeneration) return;
      gotLevel = true;
      const changed = !microphoneReady || (!voiceDetected && level > .2);
      microphoneReady = true;
      if (level > .2) voiceDetected = true;
      if (changed) renderPlayCue();
      $('#voice-status').textContent = voiceDetected ? '听到你的声音啦！读完稍停一下。' : '正在听你说。读完以后，稍停一下。';
      bars.forEach((bar, i) => { bar.style.height = `${4 + level * 29 * (.45 + .55 * Math.sin(i * .7 + performance.now() * .008) ** 2)}px`; });
    });
    if (generation !== inputGeneration) return;
    listening = false;
    scene.listening(false);
    if (result === 'heard' && adventure.step.id === stepId && !adventure.state.paused) {
      responding = true;
      renderQuest();
      if (adventure.step.kind === 'action') {
        $('#voice-status').textContent = '听到了！魔法正在响应你的声音…';
        if (adventure.step.action === 'jump') scene.jump();
        else scene.walkRight();
      } else adventure.spoken();
    }
    else if (result === 'silent') {
      showToast(`慢慢来，再跟着${elsaGuide() ? '艾莎' : '雪宝'}读一遍。`);
      renderQuest();
      autoVoiceTimer = setTimeout(() => { if (adventure.state.phase === 'playing' && !adventure.state.paused && adventure.step.id === stepId) void promptAndListen({ retry: true }); }, 800);
    }
    else if (adventure.state.phase === 'playing') renderQuest();
  } catch (error) {
    if (generation !== inputGeneration) return;
    listening = false;
    renderQuest();
    showToast(error instanceof Error ? error.message : '暂时没连上麦克风，可以切换「我读好了」。');
  }
  if (!gotLevel) bars.forEach(bar => { bar.style.height = '4px'; });
}

function showModal(kind: 'settings' | 'book' | 'pause') {
  stopInput();
  adventure.pause(true);
  const modal = $<HTMLDialogElement>('#modal');
  const title = kind === 'settings' ? '按照你的节奏冒险' : kind === 'book' ? '我的冒险手册' : '休息一下，伙伴会等你';
  const head = `<div class="modal-header"><div><span class="eyebrow">LITTLE ADVENTURER'S ${kind === 'book' ? 'JOURNAL' : 'CORNER'}</span><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭窗口">${icon('close')}</button></div>`;
  let body = '';
  if (kind === 'settings') body = `<p class="modal-intro">每一次开口都值得鼓励。选择最舒服的方式。</p><div class="mode-options">${(['voice', 'read', 'type'] as InputMode[]).map(mode => `<button class="mode-option ${adventure.state.mode === mode ? 'selected' : ''}" data-action="set-mode" data-mode="${mode}" aria-pressed="${adventure.state.mode === mode}"><span>${icon(iconForMode[mode])}</span><div><strong>${modeLabels[mode]}</strong><small>${mode === 'voice' ? '先听示范，自动开启麦克风，读完触发魔法' : mode === 'read' ? '不启用麦克风，读完后点「我读好了」' : '不用麦克风，用键盘输入英语短句'}</small></div>${icon(adventure.state.mode === mode ? 'check' : 'chevron')}</button>`).join('')}</div><div class="privacy-note">${icon('mic')} <p>声音模式在本机检测声音活动，不上传或保存录音，不校验所说内容和发音。安静的环境里玩会更顺利。</p></div><button class="primary-button" data-action="close-modal">设置好了，继续冒险 ${icon('arrow')}</button>`;
  else if (kind === 'pause') body = `<div class="pause-illustration"><img src="/assets/${elsaGuide() && adventure.level.theme !== 'welcome' ? 'body/rabbit-idle' : 'snow/buddy-idle'}.png" alt="等待你的伙伴" /></div><p class="modal-intro centered">喝口水，活动一下。<br>${adventure.level.theme === 'welcome' ? '艾莎和雪宝在这里等你。' : elsaGuide() ? '艾莎和团团在这里等你。' : '雪宝和你的冒险进度都在这里。'}</p><button class="primary-button" data-action="close-modal">${icon('play')} 继续冒险</button><button class="secondary-button" data-action="settings">调整跟读方式 ${icon('settings')}</button>`;
  else {
    const learned = adventure.state.learned;
    const info = [...new Set(adventure.level.steps.map(step => step.target ?? step.npc))].slice(0, 10);
    body = `<div class="journal-stats"><div><strong>${adventure.state.stars}</strong><span>勇气星</span></div><div><strong>${adventure.state.completed.length} / ${adventure.steps.length}</strong><span>英语互动</span></div><div><strong>${adventure.state.collected} / 3</strong><span>${starName()}</span></div></div><p class="modal-intro">${learned.length ? '这些英语已经变成了你的魔法。点击短句，可以再听一次。' : '冒险途中学会的短句会点亮在这里。先看看即将遇到的魔法吧！'}</p><div class="journal-phrases">${info.map(text => `<button class="journal-phrase ${learned.includes(text) ? 'learned' : ''}" data-action="phrase" data-phrase="${escapeHtml(text)}"><span lang="en">${escapeHtml(text)}</span>${icon(learned.includes(text) ? 'volume' : 'sparkles')}</button>`).join('')}</div><p class="journal-note">勇气星记录完成的互动和发现的星光，不是英语分数。</p><button class="primary-button" data-action="close-modal">${adventure.level.theme === 'community' ? '回到小镇' : adventure.level.theme === 'welcome' ? '回到朋友身边' : adventure.level.theme === 'animals' ? '回到营地' : adventure.level.theme === 'clothes' ? '回到舞会' : '回到森林'} ${icon('arrow')}</button>`;
  }
  $('#modal-content').innerHTML = head + body;
  if (kind === 'settings') $('#modal-content').insertAdjacentHTML('beforeend', `<details class="art-credits"><summary>人物素材出处</summary><p>艾莎角色 © Disney。素材整理自 <a href="https://www.pngall.com/elsa-png/" target="_blank" rel="noopener noreferrer">PNG All</a>、<a href="https://pngpix.com/elsa-png" target="_blank" rel="noopener noreferrer">PNGpix</a> 和 <a href="https://www.freeiconspng.com/img/42239" target="_blank" rel="noopener noreferrer">Ahkâm / FreeIconsPNG</a>。用于本个人作品，详细原图来源保留在项目素材清单中。</p></details>`);
  if (!modal.open) modal.showModal();
}

$('#modal').addEventListener('close', () => { stopInput(); adventure.pause(false); renderQuest(); });

app.addEventListener('submit', event => {
  if ((event.target as HTMLElement).id !== 'typing-form') return;
  event.preventDefault();
  if (scene.isTransitioning || scene.isActing) return;
  adventure.text($<HTMLInputElement>('#answer-input').value);
});

app.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if ((scene.isTransitioning || scene.isActing) && ['read', 'choice', 'jump', 'right', 'talk', 'example', 'slow', 'replay'].includes(action ?? '')) return;
  if (action === 'start' && loaded) { sounds.unlock(); void beginAdventure(); return; }
  if (action === 'select-level') { stopInput(); adventure.setLevel(Number(button.dataset.level)); renderAll(); return; }
  if (action === 'continue' && readyToContinue) { stopInput(); adventure.continue(); return; }
  if (action === 'talk') { sounds.unlock(); void startListening(); return; }
  if (action === 'read') { sounds.unlock(); adventure.read(); return; }
  if (action === 'choice') { adventure.choose(button.dataset.choice ?? ''); return; }
  if (action === 'jump') { scene.jump(); return; }
  if (action === 'right') { scene.walkRight(); return; }
  if (action === 'replay') {
    if (adventure.state.phase === 'playing') void promptAndListen();
    else if (adventure.state.phase === 'celebrating') { stopInput(); void celebrate(); }
    else void say(adventure.state.phase === 'complete' ? adventure.level.theme === 'toys' || elsaGuide() ? 'You did it!' : 'You brought the magic back!' : 'Hello, little adventurer!');
    return;
  }
  if (action === 'example' || action === 'slow') {
    void promptAndListen({ onlyTarget: true, slow: action === 'slow' });
    return;
  }
  if (action === 'hint') { hint = !hint; renderDialogue(); renderQuest(); return; }
  if (action === 'settings' || action === 'book' || action === 'pause') { showModal(action); return; }
  if (action === 'close-modal') { $<HTMLDialogElement>('#modal').close(); return; }
  if (action === 'set-mode') { adventure.setMode(button.dataset.mode as InputMode); showModal('settings'); return; }
  if (action === 'phrase') { void narrator.say(button.dataset.phrase ?? ''); return; }
  if (action === 'mute') {
    muted = !muted;
    narrator.enabled = sounds.enabled = !muted;
    narrator.stop();
    button.innerHTML = icon(muted ? 'mute' : 'volume');
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
    button.title = muted ? '开启声音' : '关闭声音';
    if (muted && adventure.step.kind !== 'say') { hint = true; renderDialogue(); renderQuest(); }
    return;
  }
  if (action === 'fullscreen') {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => showToast('这台浏览器暂时不能全屏。也可以按 F11 试试。'));
    return;
  }
  if (action === 'restart') { stopInput(); adventure.restart(); return; }
});

document.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).closest('input, textarea, select, dialog') || adventure.state.paused || scene.isTransitioning) return;
  if (event.key === 'Escape' && adventure.state.phase === 'playing') { showModal('pause'); return; }
  if (adventure.state.mode !== 'voice' && /^[123]$/.test(event.key) && adventure.step.kind === 'choose') adventure.choose(adventure.step.choices?.[Number(event.key) - 1]?.id ?? '');
});

adventure.addEventListener('scene-ready', () => {
  loaded = true;
  requestAnimationFrame(refreshStageSize);
  const button = $<HTMLButtonElement>('.start-button');
  button.disabled = false;
  button.innerHTML = `开启冒险 ${icon('arrow')}`;
  $('#game-canvas canvas')?.setAttribute('aria-label', '艾莎的主题冒险：听伙伴示范，用英语声音让故事继续');
});

adventure.addEventListener('change', () => {
  stopInput();
  rewardVisible = false;
  clearTimeout(successTimer);
  if (adventure.state.phase === 'playing') {
    hint = muted;
    readyToContinue = false;
    const stepId = adventure.step.id;
    narrationTimer = setTimeout(() => {
      if (adventure.state.phase === 'playing' && !adventure.state.paused && adventure.step.id === stepId) void promptAndListen();
    }, 60);
  }
  renderAll();
  if (adventure.state.phase === 'playing' && adventure.state.mode === 'type') $<HTMLInputElement>('#answer-input')?.focus({ preventScroll: true });
  if (adventure.state.phase === 'celebrating') {
    void celebrate();
  }
});

adventure.addEventListener('world-travel', event => {
  sounds.travel();
  $('#travel-title').textContent = (event as CustomEvent<{ title: string }>).detail.title;
  $('#travel-overlay').hidden = false;
  renderQuest();
});
adventure.addEventListener('world-ready', () => {
  $('#travel-overlay').hidden = true;
  renderQuest();
  if (adventure.state.mode === 'type' && adventure.state.phase === 'playing') $<HTMLInputElement>('#answer-input')?.focus({ preventScroll: true });
});
adventure.addEventListener('theme-sound', event => sounds.story((event as CustomEvent<string>).detail));
adventure.addEventListener('world-response', event => { sounds.magic((event as CustomEvent<{ effect: string }>).detail.effect); });
adventure.addEventListener('retry', event => showToast((event as CustomEvent<string>).detail));
adventure.addEventListener('collect', () => { renderHUD(); sounds.chime(); showToast(`点亮一颗${adventure.level.theme === 'toys' ? '玩具星光' : starName()}！+1 勇气星`); });
adventure.addEventListener('wardrobe-state', event => {
  const state = (event as CustomEvent<{ active: boolean; look?: string; hat?: boolean; shoes?: string; texture: string;
    portraitFrame?: string | number; portraitFrameWidth?: number; actorFrameWidth: number }>).detail;
  const frame = $('#game-frame');
  frame.dataset.actorTexture = state.texture;
  frame.dataset.actorFrameWidth = String(state.actorFrameWidth);
  if (state.active) { frame.dataset.portraitFrame = String(state.portraitFrame); frame.dataset.portraitFrameWidth = String(state.portraitFrameWidth); }
  else { delete frame.dataset.portraitFrame; delete frame.dataset.portraitFrameWidth; }
  if (state.active) { frame.dataset.look = state.look; frame.dataset.hat = String(state.hat); frame.dataset.shoes = state.shoes; }
  else { delete frame.dataset.look; delete frame.dataset.hat; delete frame.dataset.shoes; }
});
adventure.addEventListener('elsa-look-state', event => {
  const state = (event as CustomEvent<{ look: string; texture: string; frameWidth: number }>).detail;
  const frame = $('#game-frame');
  frame.dataset.elsaLook = state.look;
  frame.dataset.elsaTexture = state.texture;
  frame.dataset.elsaFrameWidth = String(state.frameWidth);
});
adventure.addEventListener('animal-state', event => {
  const state = (event as CustomEvent<{ active: boolean; friends?: string[]; fishHabitat?: string;
    fishInWater?: boolean; textures?: Record<string, string>; frameWidths?: number[] }>).detail;
  const frame = $('#game-frame');
  animalFriends = state.active ? state.friends ?? [] : [];
  if (state.active) {
    frame.dataset.animalFriends = animalFriends.join(','); frame.dataset.animalCount = String(animalFriends.length);
    frame.dataset.fishHabitat = state.fishHabitat ?? ''; frame.dataset.fishInWater = String(state.fishInWater);
    frame.dataset.animalTextures = JSON.stringify(state.textures); frame.dataset.animalFrameWidths = JSON.stringify(state.frameWidths);
  } else {
    for (const name of ['animalFriends', 'animalCount', 'fishHabitat', 'fishInWater', 'animalTextures', 'animalFrameWidths']) delete frame.dataset[name];
  }
  renderAnimalFriends();
});
adventure.addEventListener('community-state', event => {
  const state = (event as CustomEvent<{ active: boolean; friends?: string[]; doorOpen?: boolean; toothClean?: boolean;
    blanket?: boolean; passengerVisible?: boolean; textures?: Record<string, string>; frameWidths?: number[] }>).detail;
  const frame = $('#game-frame');
  communityFriends = state.active ? state.friends ?? [] : [];
  if (state.active) {
    frame.dataset.communityCount = String(communityFriends.length);
    frame.dataset.communityTextures = JSON.stringify(state.textures); frame.dataset.communityFrameWidths = JSON.stringify(state.frameWidths);
    frame.dataset.busDoorOpen = String(state.doorOpen); frame.dataset.busPassenger = String(state.passengerVisible);
    frame.dataset.toothClean = String(state.toothClean); frame.dataset.teddyBlanket = String(state.blanket);
  } else {
    for (const name of ['communityCount', 'communityTextures', 'communityFrameWidths', 'busDoorOpen', 'busPassenger', 'toothClean', 'teddyBlanket']) delete frame.dataset[name];
  }
  renderAnimalFriends();
});
adventure.addEventListener('welcome-state', event => {
  const state = (event as CustomEvent<{ active: boolean; gateOpen?: boolean; photo?: boolean }>).detail;
  const frame = $('#game-frame');
  if (state.active) { frame.dataset.welcomeGateOpen = String(state.gateOpen); frame.dataset.welcomePhoto = String(state.photo); }
  else { delete frame.dataset.welcomeGateOpen; delete frame.dataset.welcomePhoto; }
});
adventure.addEventListener('mode', () => { stopInput(); renderAll(); });
adventure.addEventListener('level', () => { stopInput(); renderAll(); });
adventure.addEventListener('pause', () => {
  if (adventure.state.paused) { stopInput(); renderPlayCue(); if (loaded) scene.scene.pause(); }
  else {
    if (loaded && scene.scene.isPaused()) scene.scene.resume();
    if (adventure.state.phase === 'playing') autoVoiceTimer = setTimeout(() => void promptAndListen(), 300);
    else if (adventure.state.phase === 'celebrating') void celebrate();
  }
});
adventure.addEventListener('complete', () => {
  elapsedSeconds = Math.round((Date.now() - runStarted) / 1000);
  sounds.chime(true);
  try {
    localStorage.setItem('little-english-adventure:last-run', JSON.stringify({ stars: adventure.state.stars, completed: adventure.state.completed.length, seconds: elapsedSeconds, date: new Date().toISOString() }));
    const progress = progressStars();
    progress[adventure.level.id] = Math.max(progress[adventure.level.id] ?? 0, adventure.state.stars);
    localStorage.setItem('little-english-adventure:progress', JSON.stringify(progress));
  } catch { /* Storage is optional, including private browsing. */ }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    voice.dispose();
    stopInput();
    if (['playing', 'celebrating'].includes(adventure.state.phase) && !$<HTMLDialogElement>('#modal').open) showModal('pause');
  }
});

window.addEventListener('pagehide', () => { frameResize.disconnect(); stopInput(); voice.dispose(); sounds.dispose(); game.destroy(true); });
renderAll();
