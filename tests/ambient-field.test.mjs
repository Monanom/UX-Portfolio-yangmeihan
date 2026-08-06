import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleAmbient = await import('../ambient-field.mjs');
const ambient = globalThis.AmbientField ?? moduleAmbient;
const { createParticles, createStars, stepParticles } = ambient;

test('首页使用可在 file 协议下加载的普通脚本', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const browserScript = await readFile(new URL('../ambient-field.mjs', import.meta.url), 'utf8');

  assert.match(html, /<script src="ambient-field\.mjs"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="ambient-field\.mjs"/);
  assert.doesNotMatch(browserScript, /\bexport\s+(?:function|const|let|class)\b/);
});

test('桌面和手机视口使用更克制的星点数量', () => {
  assert.equal(typeof ambient.createStarsForViewport, 'function');
  assert.equal(ambient.createStarsForViewport(1440, 900, 20260805).length, 24);
  assert.equal(ambient.createStarsForViewport(390, 844, 20260805).length, 14);
});

test('底部粒子在桌面为 10 颗，手机进一步精简', () => {
  assert.equal(typeof ambient.createParticlesForViewport, 'function');
  assert.equal(ambient.createParticlesForViewport(1440, 600, 8086).length, 10);
  assert.equal(ambient.createParticlesForViewport(390, 600, 8086).length, 8);
});

test('同一尺寸和种子会生成稳定且明暗大小不同的星点', () => {
  const first = createStars(1440, 900, 24, 20260805);
  const second = createStars(1440, 900, 24, 20260805);

  assert.deepEqual(first, second);
  assert.equal(first.length, 24);
  assert.ok(new Set(first.map(star => star.radius)).size >= 8);
  assert.ok(Math.min(...first.map(star => star.alpha)) < 0.2);
  assert.ok(Math.max(...first.map(star => star.alpha)) > 0.7);
  assert.ok(first.every(star => star.x >= 0 && star.x <= 1440));
  assert.ok(first.every(star => star.y >= 0 && star.y <= 900));
  const twinkling = first.filter(star => star.twinkle > 0).length;
  assert.ok(twinkling >= 8 && twinkling <= 16);
  const twinklePeriods = first
    .filter(star => star.twinkle > 0)
    .map(star => Math.PI * 2 / star.speed / 1000);
  assert.ok(twinklePeriods.every(period => period >= 3 && period <= 7));
});

test('底部粒子集中在中央并在越界后从中央底部重新出现', () => {
  const particles = createParticles(900, 600, 24, 42);
  const rising = stepParticles(particles, 16, 900, 600);

  assert.ok(particles.every(particle => particle.x >= 234 && particle.x <= 666));
  assert.ok(rising.every((particle, index) => particle.y < particles[index].y));
  assert.ok(rising.every(particle => particle.x >= 234 && particle.x <= 666));

  const escaped = [{ ...particles[0], y: -20 }];
  const respawned = stepParticles(escaped, 16, 900, 600);
  assert.ok(respawned[0].y >= 600);
  assert.ok(respawned[0].x >= 234 && respawned[0].x <= 666);
});
