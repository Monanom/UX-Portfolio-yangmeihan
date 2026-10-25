import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('导航固定在视口顶部，不受首屏裁切与内容层级限制', () => {
  const body = html.split('<body>')[1];
  assert.ok(body);
  const navPosition = body.indexOf('<nav class="nav"');
  const heroPosition = body.indexOf('<header class="hero"');
  assert.ok(navPosition > -1 && heroPosition > -1 && navPosition < heroPosition);
  assert.match(html, /\.nav\{[^}]*position:fixed;top:0;left:0;right:0;z-index:80/);
  assert.match(html, /\.nav\{[^}]*background:rgba\(/);
  assert.match(html, /html\{[^}]*scroll-padding-top:88px/);
});
