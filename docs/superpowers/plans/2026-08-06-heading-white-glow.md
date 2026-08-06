# Heading White Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为作品集五类主标题增加参考通义灵码首屏的白色柔和外发光。

**Architecture:** 在 `index.html` 中使用统一 `.title-glow` 类和 `data-glow` 文本，由 `::after` 复制字形并模糊。桌面区分主视觉与普通区块强度，手机端统一减弱；不增加 JavaScript、动画循环或第三方依赖。

**Tech Stack:** 静态 HTML、CSS、Node.js 内置测试。

## Global Constraints

- 仅覆盖首屏、关于我、精选项目、其他项目和底部联系区五类标题。
- 不覆盖项目卡片名称、数据数字、项目详情标题、导航和正文。
- 桌面主视觉约 `blur(10px)` / `opacity:.42`，普通区块约 `blur(8px)` / `opacity:.32`。
- 手机宽度不超过 560px 时约 `blur(6px)` / `opacity:.3`。
- 保持 `file://` 直接打开兼容，不增加动画。

---

### Task 1: 添加可控的标题复制层

**Files:**
- Modify: `tests/ambient-field.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `.title-glow` 统一标题类。
- Produces: `data-glow` 为伪元素提供与可见标题一致的文本。
- Consumes: 当前五类主标题现有字号、字重、行高和响应式布局。

- [x] **Step 1: Write the failing test**

```js
test('白色外发光只覆盖五类主标题', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const titleGlowMatches = html.match(/class="[^"]*title-glow[^"]*"/g) ?? [];
  assert.equal(titleGlowMatches.length, 5);
  assert.match(html, /\.title-glow::after\{[^}]*content:attr\(data-glow\)[^}]*filter:blur\(var\(--title-glow-blur\)\)/s);
  assert.doesNotMatch(html, /class="[^"]*project-name[^"]*title-glow/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/ambient-field.test.mjs`

Expected: FAIL，因为页面尚未添加 `.title-glow`。

- [x] **Step 3: Write minimal implementation**

```css
.title-glow{
  --title-glow-blur:8px;
  --title-glow-opacity:.32;
  position:relative;
  isolation:isolate;
}
.title-glow::after{
  content:attr(data-glow);
  position:absolute;
  inset:0;
  color:#fff;
  filter:blur(var(--title-glow-blur));
  opacity:var(--title-glow-opacity);
  pointer-events:none;
  white-space:pre-line;
  z-index:-1;
}
.hero-kicker.title-glow,.footer-cta h2.title-glow{
  --title-glow-blur:10px;
  --title-glow-opacity:.42;
}
@media (max-width:560px){
  .title-glow{--title-glow-blur:6px;--title-glow-opacity:.3}
}
```

为五个目标标题添加 `.title-glow` 和准确的 `data-glow`；底部联系区使用 `&#10;` 保留原有换行。

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/ambient-field.test.mjs && git diff --check`

Expected: 新增测试和原有测试全部通过。

### Task 2: 浏览器验收与交付记录

**Files:**
- Modify: `design-qa.md`
- Modify: `AI_HANDOFF.md`

**Interfaces:**
- Consumes: 五类 `.title-glow` 标题。
- Produces: 桌面、手机和后续微调参数记录。

- [x] **Step 1: Verify desktop behavior**

在首屏、项目区和底部联系区检查核心文字清晰、光晕贴合字形，项目卡片标题保持无光晕，按钮点击正常，控制台无页面自身错误。

- [x] **Step 2: Verify mobile behavior**

在 390 × 844 检查光晕弱于桌面、多行标题对齐且横向溢出为 0。

- [x] **Step 3: Record QA and handoff**

在 `design-qa.md` 记录参考来源、桌面和手机结果；在 `AI_HANDOFF.md` 记录 `.title-glow` 的强度调整入口。

- [x] **Step 4: Run final verification and commit**

Run: `node --test tests/ambient-field.test.mjs && node --check ambient-field.mjs && git diff --check`

Expected: 全部测试通过、脚本语法正确、没有空白错误。

```bash
git add index.html tests/ambient-field.test.mjs design-qa.md AI_HANDOFF.md docs/superpowers/plans/2026-08-06-heading-white-glow.md
git commit -m "增加主标题白色柔光"
```
