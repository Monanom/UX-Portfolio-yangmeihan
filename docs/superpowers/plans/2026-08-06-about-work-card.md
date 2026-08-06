# About Work Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除设计理念卡片，让工作经历与个人背景等高，并替换为低干扰抽象背景图。

**Architecture:** 保持现有三列 Grid，仅将中列由双卡片堆叠改为单张高卡片。新背景作为本地图片加载，沿用现有遮罩保证文字对比；手机端继续由现有响应式规则转为单列。

**Tech Stack:** 静态 HTML、CSS、PNG 图片、Node.js 内置测试。

## Global Constraints

- 删除设计理念卡片。
- 工作经历现有三条内容保持不变，标题改为“工作经历”。
- 桌面端工作经历与个人背景等高，手机端维持正常单列。
- 背景中央低对比、边缘蓝紫柔光，不包含文字、图标或明确主体。
- 不改动其他模块、按钮和背景动效。

---

### Task 1: 调整卡片结构并接入新背景

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `index.html`
- Create: `assets/about-career-abstract.png`

**Interfaces:**
- Consumes: `.feature-grid`、`.feature-card.tall`、`.shade` 和 `.career-list`。
- Produces: `.work-card` 等高工作经历卡片与本地抽象背景。

- [x] **Step 1: Write the failing test**

新增测试，验证页面不再包含“设计理念”和 `about-belief.jpg`，包含“工作经历”、`.work-card.tall` 与 `assets/about-career-abstract.png`，并确认图片文件存在且非空。

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/ambient-field.test.mjs`

Expected: FAIL，因为旧设计理念卡片仍存在，新背景尚未生成。

- [x] **Step 3: Write minimal implementation**

生成深黑蓝抽象 PNG；删除设计理念文章，将中列改成单张 `feature-card tall work-card`，标题改为“工作经历”，背景引用新图片。增加 `.work-card .shade` 的低对比遮罩与手机端合理最小高度。

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/ambient-field.test.mjs && git diff --check`

Expected: 15 项测试全部通过，无空白错误。

### Task 2: 视觉验收与交付记录

**Files:**
- Modify: `design-qa.md`
- Modify: `AI_HANDOFF.md`

**Interfaces:**
- Consumes: 调整后的关于我四卡片布局。
- Produces: 桌面、手机验收与图片来源记录。

- [x] **Step 1: Verify desktop and mobile**

桌面检查两张高卡片上下对齐、文字清晰；390 × 844 检查单列顺序和横向溢出。

- [x] **Step 2: Record QA and handoff**

记录新布局、背景资产路径和后续替换入口。

- [x] **Step 3: Run final verification and commit**

Run: `node --test tests/ambient-field.test.mjs && node --check ambient-field.mjs && git diff --check`

Expected: 全部通过后提交 `调整工作经历卡片布局`。
