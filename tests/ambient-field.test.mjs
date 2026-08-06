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

test('桌面联系区按视口扣除页脚后垂直居中', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /@media\s*\(min-width:901px\)/);
  assert.match(html, /min-height:calc\(100svh - 96px\)/);
  assert.match(html, /\.footer-cta\s*\{[^}]*justify-content:center/s);
});

test('白色外发光只覆盖五类主标题', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const titleGlowMatches = html.match(/class="[^"]*title-glow[^"]*"/g) ?? [];

  assert.equal(titleGlowMatches.length, 5);
  assert.match(
    html,
    /\.title-glow::after\{[^}]*content:attr\(data-glow\)[^}]*filter:blur\(var\(--title-glow-blur\)\)/s,
  );
  assert.match(
    html,
    /@media\s*\(max-width:560px\)\{[\s\S]*?\.hero-kicker\.title-glow,\s*\.footer-cta h2\.title-glow,\s*\.title-glow\s*\{[^}]*--title-glow-blur:6px/,
  );
  assert.doesNotMatch(html, /class="[^"]*project-name[^"]*title-glow/);
});

test('关于我使用横向工作经历和下方双卡片布局', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /设计理念|about-belief\.jpg/);
  assert.match(html, /\.experience-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*grid-template-rows:300px 320px/s);
  assert.match(html, /\.work-card\{[^}]*grid-column:1\/-1/s);
  assert.match(html, /class="experience-grid"[\s\S]*class="feature-card work-card[^"]*"[\s\S]*日常工具[\s\S]*个人优势/);
  assert.doesNotMatch(html, /class="feature-card tall work-card/);
  assert.match(html, /<span>工作经历<\/span>/);
  assert.match(html, /src="assets\/about-career-abstract\.png"/);

  const background = await readFile(new URL('../assets/about-career-abstract.png', import.meta.url));
  assert.ok(background.byteLength > 1000);
});

test('鼠标星光画布覆盖页面但不拦截交互', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<canvas class="cursor-starlight" id="cursorStarlight" aria-hidden="true"><\/canvas>/);
  assert.match(html, /\.cursor-starlight\{[^}]*position:fixed[^}]*pointer-events:none[^}]*z-index:50/s);
});

test('鼠标星光只在桌面精细指针和正常动态模式启用', () => {
  assert.equal(typeof ambient.shouldEnableCursorStarlight, 'function');
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, true, false), true);
  assert.equal(ambient.shouldEnableCursorStarlight(900, true, true, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, false, true, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, false, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, true, true), false);
});

test('鼠标星光散落在光标周围并在限定时间内淡出', () => {
  assert.equal(typeof ambient.createCursorSpark, 'function');
  assert.equal(typeof ambient.stepCursorSparks, 'function');
  const sparks = Array.from({ length: 20 }, (_, index) => ambient.createCursorSpark(320, 240, index + 1));

  for(const spark of sparks){
    const distance = Math.hypot(spark.x - 320, spark.y - 240);
    assert.ok(distance >= 14 && distance <= 36);
    assert.ok(spark.life >= 450 && spark.life <= 780);
    assert.ok(spark.radius >= .45 && spark.radius <= 1.55);
  }

  const stepped = ambient.stepCursorSparks(sparks, 200);
  assert.equal(stepped.length, 12);
  assert.ok(stepped.every(spark => spark.age === 200));
  assert.ok(stepped.every(spark => spark.alpha < spark.peakAlpha));
  assert.equal(ambient.stepCursorSparks(stepped, 800).length, 0);
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

test('底部微粒比主粒子更小、更亮且整体上升更快', () => {
  assert.equal(typeof ambient.createMicroParticlesForViewport, 'function');
  const main = ambient.createParticles(1440, 600, 12, 8086);
  const micro = ambient.createMicroParticlesForViewport(1440, 600, 8087);
  const mobileMicro = ambient.createMicroParticlesForViewport(390, 600, 8087);

  assert.equal(micro.length, 12);
  assert.equal(mobileMicro.length, 8);
  assert.ok(micro.every(particle => particle.micro === true));
  assert.ok(micro.every(particle => particle.radius >= .18 && particle.radius <= .5));
  assert.ok(micro.every(particle => particle.radius < Math.min(...main.map(item => item.radius))));
  assert.ok(micro.every(particle => particle.alpha >= .8 && particle.alpha <= 1));
  assert.ok(
    micro.reduce((total, particle) => total + particle.speed, 0) / micro.length
    > main.reduce((total, particle) => total + particle.speed, 0) / main.length,
  );
  assert.ok(micro.every(particle => particle.x >= 1440 * .29 && particle.x <= 1440 * .71));
  assert.ok(stepParticles(micro, 100000, 1440, 600).every(
    particle => particle.x >= 1440 * .29 && particle.x <= 1440 * .71,
  ));
});

test('背景星点光晕比核心更大且更淡', () => {
  assert.equal(typeof ambient.starGlowStyle, 'function');
  const star = createStars(900, 600, 1, 42)[0];
  const style = ambient.starGlowStyle(star, .8);

  assert.ok(style.haloRadius >= star.radius * 3);
  assert.ok(style.haloRadius <= star.radius * 4);
  assert.ok(style.haloAlpha > 0);
  assert.ok(style.haloAlpha < style.coreAlpha);
});

test('柔光从中心向外连续衰减并在边缘完全透明', () => {
  assert.equal(typeof ambient.softGlowStops, 'function');
  const stops = ambient.softGlowStops(.4);

  assert.deepEqual(stops.map(stop => stop.offset), [0, .42, 1]);
  assert.equal(stops[0].alpha, .4);
  assert.ok(stops[1].alpha > 0 && stops[1].alpha < stops[0].alpha);
  assert.equal(stops.at(-1).alpha, 0);
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
