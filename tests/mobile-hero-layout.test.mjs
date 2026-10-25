import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('手机首屏缩短后，底部对齐的标题与下一屏一起上移', () => {
  const mobileCss = html.match(/@media \(max-width:900px\)\{([\s\S]*?)\n\}\n@media \(max-width:560px\)/)?.[1];
  assert.ok(mobileCss, '需要找到手机端布局规则');
  const heroRule = mobileCss.match(/\.hero\{([^}]*)\}/)?.[1];
  const values = heroRule?.match(/min-height:calc\(100svh - clamp\((\d+)px,(\d+)svh,(\d+)px\)\)/);
  assert.ok(values, '手机端应通过缩短首屏高度，同时提升标题和后续区域');

  const [, minimum, percentage, maximum] = values.map(Number);
  const phoneHeight = 844;
  const shift = Math.min(Number(maximum), Math.max(Number(minimum), phoneHeight * Number(percentage) / 100));
  assert.ok(shift >= 80 && shift <= 120, '常见手机高度应上移约一百像素');
  assert.match(html, /\.hero-center\{[^}]*justify-content:flex-end/);
  assert.match(html, /<\/header>\s*<main>\s*<!-- 走马灯 -->/);
});

test('手机标题与按钮继续上移时不改变下一屏位置', () => {
  const mobileCss = html.match(/@media \(max-width:900px\)\{([\s\S]*?)\n\}\n@media \(max-width:560px\)/)?.[1];
  const groupRule = mobileCss?.match(/\.hero-center\{([^}]*)\}/)?.[1];
  const offset = groupRule?.match(/top:calc\(clamp\((-?\d+)px,(-?\d+)svh,(-?\d+)px\) - 64px\)/);
  assert.match(groupRule ?? '', /position:relative/);
  assert.ok(offset, '只移动首屏文字组自身，不改首屏高度');
  const [, min, preferred, max] = offset.map(Number);
  const moved = Math.max(min, Math.min(max, preferred * 844 / 100)) - 64;
  assert.ok(moved <= -94 && moved >= -114, '常见手机上应在原位置基础上再上移 64px');
  assert.match(mobileCss, /\.hero\{[^}]*min-height:calc\(100svh - clamp\(72px,12svh,120px\)\)/);
});

test('电脑端标题和按钮上移 64px，手机端仍使用独立偏移', () => {
  const desktopCss = html.slice(0, html.indexOf('@media (max-width:900px){'));
  const desktopGroupRule = desktopCss.match(/\.hero-center\{([^}]*)\}/)?.[1];
  const mobileCss = html.match(/@media \(max-width:900px\)\{([\s\S]*?)\n\}\n@media \(max-width:560px\)/)?.[1];
  const mobileGroupRule = mobileCss?.match(/\.hero-center\{([^}]*)\}/)?.[1];

  assert.match(desktopGroupRule ?? '', /position:relative;top:-64px/);
  assert.match(mobileGroupRule ?? '', /top:calc\(clamp\(-48px,-5svh,-24px\) - 64px\)/);
  assert.match(desktopCss, /\.hero\{[^}]*min-height:100svh/);
});
