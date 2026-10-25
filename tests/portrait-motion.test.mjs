import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('个人背景使用本地静态肖像', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<article class="feature-card tall portrait-card fade-in" style="--x:-30px;--y:0">/);
  assert.match(html, /<img class="bgimg portrait-base" src="assets\/about-portrait-id-badge\.webp" alt="" loading="lazy" decoding="async"/);
  assert.doesNotMatch(html, /data-portrait-motion|data-expression=/);
  assert.doesNotMatch(html, /portrait-eye-glint|portrait-eyelid|portrait-smile/);
  assert.doesNotMatch(html, /<script src="portrait-motion\.mjs"><\/script>/);

  const portrait = await readFile(new URL('../assets/about-portrait-id-badge.webp', import.meta.url));
  assert.ok(portrait.byteLength > 100_000);
});

test('静态肖像不加载表情图层和运行脚本', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /\.portrait-scene\{|\.portrait-eye-glint\{|\.portrait-eyelid\{|\.portrait-smile\{/);
  assert.doesNotMatch(html, /portrait-motion\.mjs/);
});

test('肖像调度在桌面和手机使用不同的自然间隔', async () => {
  await import('../portrait-motion.mjs');
  const { createPortraitSchedule } = globalThis.PortraitMotion;

  assert.equal(typeof createPortraitSchedule, 'function');
  assert.deepEqual(createPortraitSchedule(42, false), createPortraitSchedule(42, false));

  for(let seed = 1; seed <= 40; seed += 1){
    const desktop = createPortraitSchedule(seed, false);
    const mobile = createPortraitSchedule(seed, true);

    assert.ok(desktop.delay >= 8000 && desktop.delay <= 12000);
    assert.ok(mobile.delay >= 12000 && mobile.delay <= 18000);
    assert.ok(['gaze-left', 'gaze-right', 'blink', 'smile'].includes(desktop.expression));

    if(desktop.expression.startsWith('gaze')) assert.ok(desktop.duration >= 1200 && desktop.duration <= 1800);
    if(desktop.expression === 'blink') assert.ok(desktop.duration >= 120 && desktop.duration <= 180);
    if(desktop.expression === 'smile') assert.equal(desktop.duration, 1500);
    assert.ok(desktop.repeats === 1 || desktop.repeats === 2);
  }
});

test('肖像只在可见、允许动态且进入视口时运行', async () => {
  await import('../portrait-motion.mjs');
  const { shouldRunPortraitMotion } = globalThis.PortraitMotion;

  assert.equal(shouldRunPortraitMotion(true, true, false), true);
  assert.equal(shouldRunPortraitMotion(false, true, false), false);
  assert.equal(shouldRunPortraitMotion(true, false, false), false);
  assert.equal(shouldRunPortraitMotion(true, true, true), false);
});

test('运行时包含离屏暂停、页面隐藏和销毁清理', async () => {
  const script = await readFile(new URL('../portrait-motion.mjs', import.meta.url), 'utf8');

  assert.match(script, /IntersectionObserver/);
  assert.match(script, /visibilitychange/);
  assert.match(script, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(script, /data-motion-ready/);
  assert.match(script, /data-expression/);
  assert.match(script, /function destroyPortraitMotion\(\)/);
  assert.doesNotMatch(script, /\bexport\s+(?:function|const|let|class)\b/);
});
