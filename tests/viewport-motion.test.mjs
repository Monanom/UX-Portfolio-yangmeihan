import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../viewport-motion.mjs').catch(() => {});
const viewportMotion = globalThis.ViewportMotion;

test('持续动效仅在模块可见、页面显示且允许动态时运行', () => {
  assert.equal(typeof viewportMotion?.shouldRunViewportMotion, 'function');
  assert.equal(viewportMotion.shouldRunViewportMotion(true, true, false), true);
  assert.equal(viewportMotion.shouldRunViewportMotion(false, true, false), false);
  assert.equal(viewportMotion.shouldRunViewportMotion(true, false, false), false);
  assert.equal(viewportMotion.shouldRunViewportMotion(true, true, true), false);
});

test('页面声明统一的可视区域动效控制器和模块边界', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<header class="hero" id="top" data-motion-viewport>/);
  assert.match(html, /<section class="marquee" id="explore" data-motion-viewport/);
  assert.match(html, /class="feature-card tools-card fade-in"[^>]*data-motion-viewport/);
  assert.match(html, /class="feature-card advantage-card fade-in"[^>]*data-motion-viewport/);
  assert.match(html, /<script src="viewport-motion\.mjs"><\/script>/);
});

test('CSS 循环动效默认暂停并只在所在模块激活时运行', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /\.marquee-row\{[^}]*animation:slideL 46s linear infinite[^}]*animation-play-state:paused/s);
  assert.match(html, /\.marquee\.motion-active \.marquee-row\{animation-play-state:running\}/);
  assert.match(html, /\.tool-row\.left\{[^}]*animation:toolScrollLeft 22s linear infinite[^}]*animation-play-state:paused/s);
  assert.match(html, /\.tools-card\.motion-active \.tool-row\{animation-play-state:running\}/);
  assert.match(html, /\.advantage-tag\{[^}]*animation:floatTag[^}]*animation-play-state:paused/s);
  assert.match(html, /\.advantage-card\.motion-active \.advantage-tag\{animation-play-state:running\}/);
});
