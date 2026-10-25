import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const loader = await readFile(new URL('../hero-metal-loader.mjs', import.meta.url), 'utf8');

function startGate(desktop = true, reducedMotion = false){
  const source = html.match(/<script id="hero-title-gate">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source, '首屏标题需要在页面绘制前决定是否等待特效');
  const classes = new Set();
  const timers = [];
  let now = 0;
  let onScreenChange;
  let onReady;
  const screen = { matches: desktop, addEventListener(type, callback) { onScreenChange = callback; } };
  const motion = { matches: reducedMotion, addEventListener() {} };
  const context = {
    document: { readyState: 'loading', addEventListener(type, callback) { if(type === 'DOMContentLoaded') onReady = callback; }, documentElement: { classList: {
      add(value) { classes.add(value); },
      remove(...values) { for(const value of values) classes.delete(value); },
      contains(value) { return classes.has(value); },
    } } },
    matchMedia: query => query.includes('prefers-reduced-motion') ? motion : screen,
    performance: { now: () => now },
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout(id) { if(timers[id - 1]) timers[id - 1].cancelled = true; },
    globalThis: null,
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return { context, classes, timers, screen, ready: () => onReady?.(), screenChange: () => onScreenChange?.(), advance: ms => { now += ms; } };
}

test('桌面首帧保留标题位置但不显示静态字，特效就绪后只显示动态字', () => {
  const { context, classes, timers, ready } = startGate();
  assert.ok(classes.has('hero-title-pending'));
  assert.ok(!classes.has('hero-title-fallback'));
  assert.equal(timers.length, 0);
  ready();
  assert.equal(timers[0].delay, 3000);
  assert.equal(context.HeroTitleGate.chooseEffect(), true);
  timers[0].callback();
  assert.ok(classes.has('hero-title-effect'));
  assert.ok(!classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-pending'));
});

test('超过三秒仍未就绪时显示静态标题，本次不再突然切换', () => {
  const { context, classes, timers, ready } = startGate();
  ready();
  timers[0].callback();
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-pending'));
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
  assert.ok(!classes.has('hero-title-effect'));
});

test('主线程阻塞导致定时器晚执行，也不能在三秒后显示动态字', () => {
  const { context, classes, ready, advance } = startGate();
  ready();
  advance(3100);
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-effect'));
});

test('特效加载失败立即显示静态字，之后不再切换', () => {
  const { context, classes } = startGate();
  context.HeroTitleGate.forceFallback();
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-pending'));
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
});

test('移动端立即显示普通字，不启动特效期限', () => {
  const { context, classes, timers, ready } = startGate(false);
  ready();
  assert.equal(timers.length, 0);
  assert.ok(classes.has('hero-title-fallback'));
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
});

test('减少动态效果时首帧立即显示静态字', () => {
  const { context, classes, timers, ready } = startGate(true, true);
  ready();
  assert.equal(timers.length, 0);
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-pending'));
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
});

test('已显示的特效若丢失，仍能退回普通字且不会同时显示', () => {
  const { context, classes } = startGate();
  context.HeroTitleGate.chooseEffect();
  context.HeroTitleGate.forceFallback();
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-effect'));
});

test('桌面切到手机宽度时退回普通字', () => {
  const { context, classes, screen, screenChange } = startGate();
  context.HeroTitleGate.chooseEffect();
  screen.matches = false;
  screenChange();
  assert.ok(classes.has('hero-title-fallback'));
  assert.ok(!classes.has('hero-title-effect'));
});

test('特效脚本在期限后下载完成，不再启动第二层标题', () => {
  const { context, timers, ready } = startGate();
  const appended = [];
  context.document.readyState = 'complete';
  context.document.createElement = () => ({ src: '', onload: null, onerror: null });
  context.document.body = { append(node) { appended.push(node); } };
  vm.runInNewContext(loader, context);
  assert.equal(appended[0]?.src, 'vendor/paper-liquid-metal-0.0.78.iife.js');
  ready();
  timers[0].callback();
  appended[0].onload();
  assert.equal(appended.length, 1);
});

test('特效资源下载失败时继续显示静态标题', () => {
  const { context, classes } = startGate();
  const appended = [];
  context.document.readyState = 'complete';
  context.document.createElement = () => ({ src: '', onload: null, onerror: null });
  context.document.body = { append(node) { appended.push(node); } };
  vm.runInNewContext(loader, context);
  appended[0].onerror();
  assert.ok(classes.has('hero-title-fallback'));
  assert.equal(context.HeroTitleGate.chooseEffect(), false);
});
