# Footer CTA Centering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌面端让联系区主体基于视口与页脚高度自适应居中，保持底部光晕贴底。

**Architecture:** 继续使用 `index.html` 内现有 CSS。新增桌面端媒体查询，为 `.footer-cta` 设置视口相关的最小高度、垂直居中和收敛后的上下内边距；不修改 HTML 结构、Canvas 或光晕伪元素。

**Tech Stack:** 原生 HTML/CSS、Node.js `node:test`。

## Global Constraints

- 仅在 `min-width:901px` 生效。
- 使用 `min-height:calc(100svh - 96px)`。
- 手机端、光晕、粒子和页脚保持不变。

---

### Task 1: 桌面联系区布局

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `index.html`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: 现有 `.footer-cta` Flex 布局和 `.footer-cta::before` 光晕层。
- Produces: 桌面端自适应最小高度与垂直居中规则。

- [ ] **Step 1:** 添加失败测试，读取 `index.html` 并断言存在桌面媒体查询、`min-height:calc(100svh - 96px)` 与 `justify-content:center`。
- [ ] **Step 2:** 运行 `node --test tests/ambient-field.test.mjs`，确认布局规则缺失导致失败。
- [ ] **Step 3:** 在 `index.html` 添加桌面规则，保持移动端和光晕伪元素不变。
- [ ] **Step 4:** 运行全部测试、语法与差异检查，并在页面底部核对主体位置和光晕贴底关系。
- [ ] **Step 5:** 更新 `design-qa.md` 并提交版本。
