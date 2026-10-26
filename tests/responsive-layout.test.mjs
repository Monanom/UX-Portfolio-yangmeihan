import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('矮桌面视口收缩首屏标题，并为导航保留空间', () => {
  assert.match(html, /\.hero-kicker\{font-size:clamp\(60px,min\(10\.5vw,15svh\),144px\)/);
  assert.match(html, /\.hero-center\{position:relative;top:clamp\(-64px,calc\(100px - 25svh\),-24px\)/);
  assert.match(html, /\.hero\{[^}]*min-height:max\(100svh,540px\)/);

  const titleSize = (width, height) => Math.max(60, Math.min(width * .105, height * .15, 144));
  const shift = height => Math.max(-64, Math.min(100 - height * .25, -24));
  assert.ok(titleSize(1280, 595) < 100, '小屏标题不应继续保持 134px');
  assert.ok(shift(595) > -50, '矮视口不应让标题组固定上移 64px');
  assert.equal(titleSize(1920, 1080), 144, '高分辨率桌面保留现有字号上限');

  for(const [width, height] of [[901, 500], [1024, 768], [1280, 595], [1440, 900], [1920, 1080]]){
    const heroHeight = Math.max(height, 540);
    const fontSize = titleSize(width, height);
    const subtitleHeight = Math.max(16, Math.min(width * .02, 24)) * 1.4;
    const bottomPadding = Math.max(56, Math.min(height * .09, 110));
    const contentHeight = fontSize * .96 * 2 + 48 + subtitleHeight + 48 + 46 + bottomPadding;
    const titleTop = 92 + shift(height) + Math.max(0, heroHeight - 92 - contentHeight);
    assert.ok(titleTop >= 90, `${width}×${height} 的标题不得进入导航区域`);
  }
});

test('页尾蓝光锚定在整页底部，不在联系区结束时截断', () => {
  assert.match(html, /body::after\{[^}]*position:absolute;[^}]*bottom:0;[^}]*background-image:url\("assets\/backgrounds\/lingma-footer-glow-desktop\.webp"\)/);
  assert.match(html, /@media \(max-width:900px\)\{[\s\S]*?body::after\{[^}]*lingma-footer-glow-mobile\.webp/);
  assert.doesNotMatch(html, /\.footer-cta::before\{[^}]*lingma-footer-glow-desktop\.webp/);
});
