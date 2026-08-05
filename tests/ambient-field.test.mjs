import test from 'node:test';
import assert from 'node:assert/strict';
import { createParticles, createStars, stepParticles } from '../ambient-field.mjs';

test('同一尺寸和种子会生成稳定且明暗大小不同的星点', () => {
  const first = createStars(1440, 900, 72, 20260805);
  const second = createStars(1440, 900, 72, 20260805);

  assert.deepEqual(first, second);
  assert.equal(first.length, 72);
  assert.ok(new Set(first.map(star => star.radius)).size >= 8);
  assert.ok(Math.min(...first.map(star => star.alpha)) < 0.2);
  assert.ok(Math.max(...first.map(star => star.alpha)) > 0.7);
  assert.ok(first.every(star => star.x >= 0 && star.x <= 1440));
  assert.ok(first.every(star => star.y >= 0 && star.y <= 900));
});

test('底部粒子持续上升并在越界后从底部重新出现', () => {
  const particles = createParticles(900, 600, 12, 42);
  const rising = stepParticles(particles, 16, 900, 600);

  assert.ok(rising.every((particle, index) => particle.y < particles[index].y));

  const escaped = [{ ...particles[0], y: -20 }];
  const respawned = stepParticles(escaped, 16, 900, 600);
  assert.ok(respawned[0].y >= 600);
  assert.ok(respawned[0].x >= 0 && respawned[0].x <= 900);
});
