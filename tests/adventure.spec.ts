import { test, expect } from '@playwright/test';
import { setMode, installVoiceHarness } from './helpers';
import { LEVELS } from '../src/game/level';

test('问候新手关：收礼物、礼貌开门、邀请猫头鹰、合影、通关和重玩', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/snow-intro.png', fullPage: true });
  await setMode(page, 'read');
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await page.getByRole('button', { name: '开启冒险' }).click();

  for (const [index, step] of LEVELS[0]!.steps.entries()) {
    await expect(page.locator('.step-number')).toHaveText(`${index + 1} / 13`);
    await expect(page.locator('#game-frame')).toHaveAttribute('data-moment', step.moment!.type);
    await page.getByRole('button', { name: '我读好了，施展魔法！' }).click();
    await expect(page.locator('.star-reward')).toContainText('+1 勇气星');
    if (step.id === 'w-please') {
      await expect(page.locator('#game-frame')).toHaveAttribute('data-welcome-gate-open', 'true');
      await page.screenshot({ path: 'test-results/welcome-gate.png', fullPage: true });
    }
    if (step.id === 'w-goodbye') await expect(page.locator('#game-frame')).toHaveAttribute('data-welcome-photo', 'true');
    await expect(page.locator('.continue-button')).toBeEnabled();
    await page.locator('.continue-button').click();
  }
  await expect(page.locator('#complete-overlay')).toBeVisible();
  await expect(page.locator('#star-count')).toHaveText('13');
  await expect(page.locator('#discovery-count')).toContainText('3 / 3');
  await expect(page.locator('.spell-slot')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/snow-complete.png', fullPage: true });
  await page.getByRole('button', { name: '看看我的收获' }).click();
  await expect(page.locator('.journal-phrase.learned')).toHaveCount(7);
  await page.getByRole('button', { name: '回到朋友身边' }).click();
  await page.locator('[data-action="restart"]').last().click();
  await expect(page.locator('#intro-overlay')).toBeVisible();
  await expect(page.locator('#star-count')).toHaveText('0');
  await expect(page.locator('.spell-slot.unlocked')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled();
  await page.getByRole('button', { name: '开启冒险' }).click();
  await expect(page.locator('.step-number')).toHaveText('1 / 13');
  expect(errors).toEqual([]);
});

test('默认纯语音：注入声音活动，所有动作自动完成，期间无需点击或按键', async ({ page }) => {
  test.setTimeout(210_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installVoiceHarness(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: '开启冒险' }).click();
  // After the parent starts, all thirteen story actions and transitions are voice-driven.
  await expect(page.locator('.quest-title')).toContainText('和雪宝');
  await expect(page.locator('.step-number')).toHaveText('4 / 13', { timeout: 40_000 });
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'speak');
  await page.screenshot({ path: 'test-results/snow-voice-orchard.png', fullPage: true });
  await expect(page.locator('.step-number')).toHaveText('12 / 13', { timeout: 90_000 });
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'success');
  await page.screenshot({ path: 'test-results/snow-voice-cast.png', fullPage: true });
  await expect(page.locator('#complete-overlay')).toBeVisible({ timeout: 180_000 });
  await page.screenshot({ path: 'test-results/snow-voice-complete.png', fullPage: true });
  await expect(page.locator('#star-count')).toHaveText('13');
  await expect(page.locator('#discovery-count')).toContainText('3 / 3');
  await expect(page.locator('.spell-slot')).toHaveCount(0);
  const trace = await page.evaluate(() => (window as unknown as { voiceTest: { speech: { text: string; src: string; ended: boolean; cancelled: boolean; travelling: boolean; tone: string | undefined }[]; microphoneOverlaps: number; travelOverlaps: number; synthesisCalls: number } }).voiceTest);
  const praises = trace.speech.filter(item => ['Good!', 'Great job!', 'Well done!', 'You did it!', 'Nice jump!', 'Amazing!', 'Cool!'].includes(item.text));
  expect(praises).toHaveLength(13);
  expect(praises.every(item => item.ended && !item.cancelled && item.tone === 'success')).toBeTruthy();
  // "Your turn!" 已移除：提示音 + 视觉提示代替语音交接，麦克风零延迟接话
  expect(trace.speech.filter(item => item.text === 'Your turn!')).toHaveLength(0);
  expect(trace.microphoneOverlaps).toBe(0);
  expect(trace.travelOverlaps).toBe(0);
  expect(trace.synthesisCalls).toBe(0);
  expect(trace.speech.every(item => /\/assets\/audio\/[^/]+\.mp3$/.test(item.src))).toBeTruthy();
  expect(trace.speech.every(item => !item.travelling)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('强提示与鼓励：等欢呼读完才继续，暂停后重播鼓励，不提前开麦', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installVoiceHarness(page, 4200);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: '开启冒险' }).click();
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'listen');
  await expect(page.locator('#play-cue')).toContainText('听艾莎读一读');
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'speak');
  await expect(page.locator('.cue-phrase')).toHaveText('Hello!');
  await page.screenshot({ path: 'test-results/snow-speaking.png', fullPage: true });
  // 表扬语与魔法动画并行后，"正在施法"一闪而过，直接进入 success。
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'success', { timeout: 10_000 });
  await expect(page.locator('.cue-phrase')).toHaveText('Good!');
  await expect(page.locator('#dialogue')).toContainText('Good!');
  await page.screenshot({ path: 'test-results/snow-good.png', fullPage: true });
  await page.waitForTimeout(2400);
  await expect(page.locator('.step-number')).toHaveText('1 / 13');
  expect(await page.evaluate(() => (window as unknown as { voiceTest: { active: boolean } }).voiceTest.active)).toBeTruthy();
  await page.getByRole('button', { name: '暂停一下', exact: true }).click();
  await expect(page.locator('#play-cue')).toBeHidden();
  await page.waitForTimeout(600);
  await expect(page.locator('#star-count')).toHaveText('1');
  await page.getByRole('button', { name: '继续冒险', exact: true }).click();
  await expect(page.locator('.cue-phrase')).toHaveText('Good!');
  await expect(page.locator('.step-number')).toHaveText('2 / 13', { timeout: 10_000 });
  const trace = await page.evaluate(() => (window as unknown as { voiceTest: { speech: { text: string; ended: boolean; cancelled: boolean }[]; microphoneOverlaps: number; synthesisCalls: number } }).voiceTest);
  const praise = trace.speech.filter(item => item.text === 'Good!');
  expect(praise).toHaveLength(2);
  expect(praise[0]!.cancelled).toBeTruthy();
  expect(praise[1]!.ended && !praise[1]!.cancelled).toBeTruthy();
  expect(trace.microphoneOverlaps).toBe(0);
  expect(trace.synthesisCalls).toBe(0);
  await page.getByRole('button', { name: '暂停一下', exact: true }).click();
  expect(errors).toEqual([]);
});

test('麦克风拒绝不会伪造通关；可切换跟读；暂停和键盘输入不丢进度', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: '开启冒险' }).click();
  await expect(page.locator('#intro-overlay')).toBeVisible();
  await expect(page.locator('#star-count')).toHaveText('0');
  await expect(page.locator('#world-toast')).toContainText('请允许浏览器使用麦克风');
  await setMode(page, 'type');
  await page.locator('.start-button').click();
  await page.locator('#answer-input').fill('hello');
  await page.locator('#answer-input').press('Enter');
  // The new story awaits its animation and the actual end of the MiniMax result.
  await expect(page.locator('.continue-button')).toBeEnabled({ timeout: 16_000 });
  await page.locator('.continue-button').click();
  await page.locator('#answer-input').fill('My name is Amy');
  await page.locator('#answer-input').press('Enter');
  await expect(page.locator('.continue-button')).toBeEnabled({ timeout: 16_000 });
  await page.locator('.continue-button').click();
  await page.getByRole('button', { name: '暂停一下', exact: true }).click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#star-count')).toHaveText('2');
  await page.getByRole('button', { name: '继续冒险', exact: true }).click();
  await expect(page.locator('.step-number')).toHaveText('3 / 13');
  await page.locator('#answer-input').fill('wrong');
  await page.locator('#answer-input').press('Enter');
  await expect(page.locator('#star-count')).toHaveText('2');
  await expect(page.locator('#world-toast')).toContainText('再试一次');
  expect(errors).toEqual([]);
});

test('窄窗口保留阅读和操作，没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/snow-narrow.png', fullPage: true });
});

test('电脑窗口完整显示场景和伙伴对话，纯语音任务无需滚动', async ({ page }) => {
  for (const size of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('button', { name: '开启冒险' })).toBeEnabled({ timeout: 20_000 });
    const canvas = await page.locator('#game-canvas canvas').boundingBox();
    const frame = await page.locator('#game-frame').boundingBox();
    expect(canvas).toBeTruthy();
    expect(frame).toBeTruthy();
    expect(Math.abs(canvas!.width - frame!.width)).toBeLessThan(2);
    expect(frame!.y + frame!.height + 38).toBeLessThanOrEqual(size.height);
    await expect(page.locator('.level-option[data-level="1"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/snow-${size.width}.png`, fullPage: true });
  }
});

test('切换家长试玩模式与减少动态效果：画布保持完整，回应后才显示鼓励', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await expect(page.locator('.start-button')).toBeEnabled({ timeout: 20_000 });
  for (const mode of ['read', 'type', 'voice', 'read'] as const) {
    await setMode(page, mode);
    await expect.poll(async () => page.evaluate(() => {
      const frame = document.querySelector('#game-frame')!.getBoundingClientRect();
      const canvas = document.querySelector('#game-canvas canvas')!.getBoundingClientRect();
      return Math.max(Math.abs(canvas.x - frame.x), Math.abs(canvas.y - frame.y), Math.abs(canvas.width - frame.width), Math.abs(canvas.height - frame.height));
    })).toBeLessThan(2);
  }
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await page.locator('.start-button').click();
  await expect(page.locator('[data-action="read"]')).toBeEnabled();
  await page.locator('[data-action="read"]').click();
  await expect(page.locator('#play-cue')).toHaveAttribute('data-tone', 'success', { timeout: 10_000 });
  await expect(page.locator('.cue-phrase')).toHaveText('Good!');
  await expect(page.locator('.continue-button')).toBeEnabled();
  await page.locator('.continue-button').click();
  await expect(page.locator('.step-number')).toHaveText('2 / 13');
  expect(errors).toEqual([]);
});
