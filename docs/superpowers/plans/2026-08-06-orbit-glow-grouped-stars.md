# Orbit Glow and Grouped Stars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强项目区轨道蓝色环境光，并让 4 组星点按 1.7 秒节奏接力闪烁。

**Architecture:** 保留 `ambient-field.mjs` 的单 Canvas 和现有底部粒子逻辑。星点增加 `group`、`baseAlpha` 与 `peakAlpha`，由纯函数计算组间交接亮度；轨道光晕继续由 `index.html` 的正文背景层承担，不引入新素材或依赖。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Canvas 2D、Node.js `node:test`。

## Global Constraints

- 桌面普通星点 40 颗，手机 22 颗。
- 4 组按 1700ms 交接，只有相邻两组高于基础亮度。
- 底部粒子桌面 10 颗、手机 8 颗，分布范围保持 26%–74%。
- 支持 `file://` 直接打开和 `prefers-reduced-motion` 静态降级。
- 不修改卡片、按钮、轨道位置和页脚光晕素材。

---

### Task 1: 分组星点数据与亮度计算

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `ambient-field.mjs`

**Interfaces:**
- Consumes: `createStars(width, height, count, seed)`。
- Produces: `starGroupIntensity(group, time, staticFrame)` 与带有 `group`、`baseAlpha`、`peakAlpha` 的星点数组。

- [ ] **Step 1:** 先写失败测试，断言桌面/手机数量为 40/22、4 组均非空，并验证 0ms 与 1700ms 的主亮组发生切换。
- [ ] **Step 2:** 运行 `node --test tests/ambient-field.test.mjs`，确认因数量和亮度函数未实现而失败。
- [ ] **Step 3:** 实现 4 组象限分配、平滑交接函数，并让 `drawStar` 使用基础亮度与峰值亮度插值。
- [ ] **Step 4:** 再次运行测试，确认新增和原有测试全部通过。

### Task 2: 轨道局部蓝色光晕

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: 现有 `main::before` 长背景层。
- Produces: 两团与轨道区域对齐的蓝色径向渐变；移动端使用更弱、更小的参数。

- [ ] **Step 1:** 在正文背景图片上方增加两层局部径向渐变，不改变长背景图的大小和纵向锚点。
- [ ] **Step 2:** 在 1440×900 和 390×844 下检查轨道可见度、卡片对比度和横向滚动。

### Task 3: 完整验证与版本保存

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: Task 1 和 Task 2 的最终页面。
- Produces: 可复查的视觉验收记录与 Git 版本。

- [ ] **Step 1:** 运行 `node --test tests/ambient-field.test.mjs`、`node --check ambient-field.mjs` 与 `git diff --check`。
- [ ] **Step 2:** 验证两帧截图不同、页面控制台无自身错误、减少动态效果为静态。
- [ ] **Step 3:** 记录验收结果并提交本次修改。
