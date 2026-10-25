import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('两处微信名片显示杨小曼和正式二维码，不再出现占位提示', async () => {
  const cards = [...html.matchAll(/<div class="wechat-popover(?: center)?"[^>]*>([\s\S]*?<img class="wechat-qr-image"[^>]*\/>[\s\S]*?)<\/div>/g)];
  assert.equal(cards.length, 2);
  for (const [, card] of cards) {
    assert.match(card, /class="wechat-profile-name">杨小曼<\/strong>/);
    assert.match(card, /class="wechat-profile-location">Iris1943<\/span>/);
    assert.match(card, /class="wechat-qr-image" src="assets\/wechat-qr-user\.png" alt="杨小曼微信二维码" loading="lazy" decoding="async" width="700" height="700"/);
    assert.doesNotMatch(card, /二维码暂为占位图|class="hint"|微信名片<\/strong>/);
  }
  const qr = await readFile(new URL('../assets/wechat-qr-user.png', import.meta.url));
  assert.ok(qr.byteLength > 100_000);
  assert.equal(qr.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(qr.readUInt32BE(16), 700);
  assert.equal(qr.readUInt32BE(20), 700);
});

test('微信名片文字左对齐，二维码下方仅保留卡片内边距', () => {
  assert.match(html, /\.wechat-popover\{[^}]*padding:18px/);
  assert.match(html, /\.wechat-profile\{[^}]*text-align:left/);
  assert.match(html, /\.wechat-qr-image\{[^}]*width:100%/);
  assert.doesNotMatch(html, /\.wechat-popover \.hint\{/);
});

test('微信二维码按原图正方形比例缩放，不被 HTML 高度属性拉长', () => {
  assert.match(html, /\.wechat-qr-image\{[^}]*width:100%;height:auto;aspect-ratio:1\/1;object-fit:contain/);
});

test('两处微信头像使用原画并在圆形容器中放大裁切', async () => {
  const avatarImages = [...html.matchAll(/<div class="wechat-avatar"><img src="([^"]+)" alt="微信头像" \/><\/div>/g)];
  assert.equal(avatarImages.length, 2);
  assert.ok(avatarImages.every(([, src]) => src === 'assets/wechat-avatar-cat.jpg'));
  assert.match(html, /\.wechat-avatar\{[^}]*width:44px;height:44px[^}]*overflow:hidden[^}]*border-radius:50%/);
  assert.match(html, /\.wechat-avatar img\{[^}]*width:66px[^}]*transform:translate\(-50%,-50%\)/);
  const avatar = await readFile(new URL('../assets/wechat-avatar-cat.jpg', import.meta.url));
  assert.ok(avatar.byteLength > 10_000);
});
