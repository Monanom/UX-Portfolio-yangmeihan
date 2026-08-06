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
  assert.equal(ambient.createStarsForViewport(1440, 900, 20260805).length, 40);
  assert.equal(ambient.createStarsForViewport(390, 844, 20260805).length, 22);
});

test('底部粒子在桌面为 10 颗，手机进一步精简', () => {
  assert.equal(typeof ambient.createParticlesForViewport, 'function');
  assert.equal(ambient.createParticlesForViewport(1440, 600, 8086).length, 10);
  assert.equal(ambient.createParticlesForViewport(390, 600, 8086).length, 8);
});

test('同一尺寸和种子会生成稳定、分区且层次不同的星点', () => {
  const first = createStars(1440, 900, 40, 20260805);
  const second = createStars(1440, 900, 40, 20260805);

  assert.deepEqual(first, second);
  assert.equal(first.length, 40);
  assert.ok(new Set(first.map(star => star.radius)).size >= 8);
  assert.ok(first.every(star => star.baseAlpha < star.peakAlpha));
  assert.ok(Math.min(...first.map(star => star.baseAlpha)) < 0.05);
  assert.ok(Math.max(...first.map(star => star.peakAlpha)) > 0.75);
  assert.ok(first.every(star => star.x >= 0 && star.x <= 1440));
  assert.ok(first.every(star => star.y >= 0 && star.y <= 900));
  assert.deepEqual(new Set(first.map(star => star.group)), new Set([0, 1, 2, 3]));
  assert.ok(first.filter(star => star.group === 0).every(star => star.x <= 720 && star.y <= 450));
  assert.ok(first.filter(star => star.group === 3).every(star => star.x >= 720 && star.y >= 450));
});

test('四组星点每 1.7 秒平滑接力且不会同时亮起', () => {
  assert.equal(typeof ambient.starGroupIntensity, 'function');
  const atStart = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 0, false));
  const atHandoff = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 850, false));
  const atNext = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 1700, false));

  assert.deepEqual(atStart, [1, 0, 0, 0]);
  assert.deepEqual(atHandoff, [.5, .5, 0, 0]);
  assert.deepEqual(atNext, [0, 1, 0, 0]);
  assert.ok(atHandoff.filter(value => value > 0).length <= 2);
  assert.deepEqual(
    [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 5000, true)),
    [.72, 0, 0, 0],
  );
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
