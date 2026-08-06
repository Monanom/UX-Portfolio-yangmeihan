# Star Halo And Micro Particles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为背景星点增加淡蓝光晕，并为底部增加小而亮的上升微粒层。

**Architecture:** 继续使用 `ambient-field.mjs` 的单一背景 Canvas 和现有 30 帧循环。新增纯数据生成函数管理微粒参数，背景星点和两类底部粒子都通过分层绘制产生核心与光晕，避免新增 DOM、Canvas 或第三方依赖。

**Tech Stack:** 原生 JavaScript、Canvas 2D、Node.js 内置测试。

## Global Constraints

- 保留现有背景星点桌面 40 颗、手机 22 颗及四区分组节奏。
- 保留现有底部主粒子桌面 10 颗、手机 8 颗。
- 新增微粒桌面 12 颗、手机 8 颗，尺寸为主粒子的约 25%–45%，核心更亮、光晕更窄、速度略快。
- 微粒继续集中在中央蓝色光晕区域。
- 复用现有约 30 帧循环，保持 `file://` 直接打开和减少动态效果降级。
- 不修改鼠标跟随星光、卡片、按钮、背景素材和页面布局。

---

### Task 1: 定义小而亮的底部微粒

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `ambient-field.mjs`

**Interfaces:**
- Produces: `createMicroParticles(width, height, count, seed)` 返回微粒数据数组。
- Produces: `createMicroParticlesForViewport(width, height, seed)` 返回桌面 12 颗或手机 8 颗微粒。
- Consumes: 现有 `seededRandom` 与 `stepParticles`。

- [x] **Step 1: Write the failing test**

```js
test('底部微粒比主粒子更小更亮且略快', () => {
  const main = ambient.createParticles(1440, 600, 10, 8086);
  const micro = ambient.createMicroParticlesForViewport(1440, 600, 8087);
  assert.equal(micro.length, 12);
  assert.ok(micro.every(item => item.radius >= .18 && item.radius <= .5));
  assert.ok(micro.every(item => item.alpha >= .52));
  assert.ok(Math.min(...micro.map(item => item.speed)) > Math.min(...main.map(item => item.speed)));
  assert.ok(micro.every(item => item.x >= 1440 * .29 && item.x <= 1440 * .71));
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/ambient-field.test.mjs`

Expected: FAIL，因为 `createMicroParticlesForViewport` 尚未定义。

- [x] **Step 3: Write minimal implementation**

```js
function createMicroParticles(width, height, count, seed = 8087){
  const random = seededRandom(seed + Math.round(width) * 23 + Math.round(height) * 29);
  return Array.from({ length: count }, (_, index) => ({
    x: width * (.29 + random() * .42),
    y: random() * height,
    radius: .18 + random() * .32,
    alpha: .52 + random() * .4,
    speed: .018 + random() * .026,
    drift: (random() - .5) * .005,
    phase: random() * Math.PI * 2,
    cycle: index,
    micro: true,
  }));
}

function createMicroParticlesForViewport(width, height, seed = 8087){
  return createMicroParticles(width, height, width <= 560 ? 8 : 12, seed);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/ambient-field.test.mjs`

Expected: 新增测试和原有测试全部 PASS。

### Task 2: 绘制背景蓝色光晕与双层底部粒子

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `ambient-field.mjs`

**Interfaces:**
- Consumes: `createMicroParticlesForViewport(width, height, seed)`。
- Produces: `starGlowStyle(star, intensity)` 返回 `{ coreAlpha, haloAlpha, haloRadius }`，供绘制与测试共同使用。

- [x] **Step 1: Write the failing test**

```js
test('背景星点光晕比核心更大且更淡', () => {
  const star = ambient.createStars(900, 600, 1, 42)[0];
  const style = ambient.starGlowStyle(star, .8);
  assert.ok(style.haloRadius >= star.radius * 3);
  assert.ok(style.haloRadius <= star.radius * 4);
  assert.ok(style.haloAlpha > 0);
  assert.ok(style.haloAlpha < style.coreAlpha);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/ambient-field.test.mjs`

Expected: FAIL，因为 `starGlowStyle` 尚未定义。

- [x] **Step 3: Write minimal implementation**

```js
function starGlowStyle(star, intensity){
  const coreAlpha = star.baseAlpha + (star.peakAlpha - star.baseAlpha) * intensity;
  return { coreAlpha, haloAlpha: coreAlpha * .14, haloRadius: star.radius * 3.6 };
}
```

在 `resize()` 创建 `microParticles`；在底部可见时与主粒子分别调用 `stepParticles`。`drawStar` 先使用浅蓝径向渐变画外晕再画核心；`drawParticle` 根据 `particle.micro` 为微粒绘制更窄的浅蓝外晕和更亮核心。

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/ambient-field.test.mjs && node --check ambient-field.mjs && git diff --check`

Expected: 全部检查通过。

### Task 3: 浏览器验收与交付记录

**Files:**
- Modify: `design-qa.md`
- Modify: `AI_HANDOFF.md`

**Interfaces:**
- Consumes: 最终 Canvas 页面效果。
- Produces: 可供下一位 AI 继续调整的参数说明和验收记录。

- [x] **Step 1: Verify desktop behavior**

在桌面预览中检查项目区背景星点带淡蓝外晕，底部联系区同时存在柔和主粒子与锐亮微粒；确认按钮仍能点击，控制台无页面自身错误。

- [x] **Step 2: Verify mobile and reduced-motion behavior**

在 390 × 844 检查无横向滚动，微粒数量为 8；启用减少动态效果后粒子位置保持静态。

- [x] **Step 3: Record QA and handoff**

在 `design-qa.md` 记录桌面、手机、控制台和动态降级结果；在 `AI_HANDOFF.md` 记录光晕及微粒的调整入口。

- [x] **Step 4: Run final verification and commit**

Run: `node --test tests/ambient-field.test.mjs && node --check ambient-field.mjs && git diff --check`

Expected: 全部测试通过、语法正确、没有空白错误。

```bash
git add ambient-field.mjs tests/ambient-field.test.mjs design-qa.md AI_HANDOFF.md docs/superpowers/plans/2026-08-06-star-halo-micro-particles.md
git commit -m "增强星点光晕与底部微粒层次"
```
