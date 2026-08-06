import test from 'node:test';
import assert from 'node:assert/strict';
import * as ambient from '../ambient-field.mjs';

const { createParticles, createStars, stepParticles } = ambient;

test('桌面和手机视口使用更克制的星点数量', () => {
  assert.equal(typeof ambient.createStarsForViewport, 'function');
  assert.equal(ambient.createStarsForViewport(1440, 900, 20260805).length, 40);
  assert.equal(ambient.createStarsForViewport(390, 844, 20260805).length, 22);
});

test('同一尺寸和种子会生成稳定且明暗大小不同的星点', () => {
  const first = createStars(1440, 900, 40, 20260805);
  const second = createStars(1440, 900, 40, 20260805);

  assert.deepEqual(first, second);
  assert.equal(first.length, 40);
  assert.ok(new Set(first.map(star => star.radius)).size >= 8);
  assert.ok(Math.min(...first.map(star => star.alpha)) < 0.2);
  assert.ok(Math.max(...first.map(star => star.alpha)) > 0.7);
  assert.ok(first.every(star => star.x >= 0 && star.x <= 1440));
  assert.ok(first.every(star => star.y >= 0 && star.y <= 900));
  const twinkling = first.filter(star => star.twinkle > 0).length;
  assert.ok(twinkling >= 14 && twinkling <= 26);
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
