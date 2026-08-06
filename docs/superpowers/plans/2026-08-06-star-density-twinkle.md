# Star Density and Twinkle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 减少背景星点、让约一半星点不同步闪烁，并把底部上升粒子限制在中央蓝色光晕区域。

**Architecture:** 保留现有 `ambient-field.mjs` 单 Canvas 架构。新增一个按视口选择数量的星点工厂，继续用固定种子生成稳定数据；闪烁资格和粒子中央范围都在数据生成阶段确定，绘制循环只消费结果。

**Tech Stack:** 原生 JavaScript ES Module、Canvas 2D、Node.js `node:test`。

## Global Constraints

- 桌面生成 40 颗星，宽度不大于 560px 时生成 22 颗星。
- 每颗星以 50% 概率闪烁，固定样本的闪烁比例需落在 35%–65%。
- 上升粒子横坐标必须落在页面宽度的 26%–74%。
- `prefers-reduced-motion` 开启时保持静态，底部粒子数量和速度不变。

---

### Task 1: 调整星点密度、闪烁资格与粒子分布

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `ambient-field.mjs`

**Interfaces:**
- Consumes: `createStars(width, height, count, seed)`、`createParticles(width, height, count, seed)`、`stepParticles(particles, elapsed, width, height)`。
- Produces: `createStarsForViewport(width, height, seed)`，返回已经按断点确定数量的星点数组。

- [ ] **Step 1: 写失败测试**

在 `tests/ambient-field.test.mjs` 中改用模块命名空间，并增加以下断言：

```js
assert.equal(typeof ambient.createStarsForViewport, 'function');
assert.equal(ambient.createStarsForViewport(1440, 900, 20260805).length, 40);
assert.equal(ambient.createStarsForViewport(390, 844, 20260805).length, 22);

const stars = ambient.createStars(1440, 900, 40, 20260805);
const twinkling = stars.filter(star => star.twinkle > 0).length;
assert.ok(twinkling >= 14 && twinkling <= 26);

const particles = ambient.createParticles(900, 600, 24, 42);
assert.ok(particles.every(particle => particle.x >= 234 && particle.x <= 666));
```

同时把越界重生后的粒子横坐标断言改成 `234–666`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/ambient-field.test.mjs`

Expected: FAIL，因为 `createStarsForViewport` 尚不存在、当前全部星点都会闪烁、粒子仍可能出现在左右边缘。

- [ ] **Step 3: 实现最小修改**

在 `ambient-field.mjs` 中：

```js
export function createStarsForViewport(width, height, seed = 20260805){
  return createStars(width, height, width <= 560 ? 22 : 40, seed);
}
```

生成星点时先计算 `const animated = random() < .5`，并把 `twinkle` 设置为 `animated ? .04 + random() * .18 : 0`；仍为每颗星生成不同的 `phase` 和 `speed`。

生成和重生粒子时使用：

```js
x: width * (.26 + random() * .48)
```

在 `resize()` 中用 `createStarsForViewport(width, height)` 替换现有的 34/72 数量判断。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/ambient-field.test.mjs`

Expected: 现有测试和新增测试全部 PASS。

- [ ] **Step 5: 浏览器视觉检查**

在 `http://127.0.0.1:4173/` 检查 1440×900 与 390×844：星点明显减少；正常动态偏好下部分星点不同步闪烁；底部上升粒子只出现在中央蓝色光晕区域；控制台无错误。

- [ ] **Step 6: 完整验证并提交**

Run: `node --check ambient-field.mjs`

Run: `git diff --check`

Commit:

```bash
git add ambient-field.mjs tests/ambient-field.test.mjs
git commit -m "减少背景星点并优化闪烁分布"
```
