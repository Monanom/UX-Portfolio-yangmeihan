import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const webpFiles = [
  'assets/hero-video-poster.webp',
  'assets/about-portrait-id-badge.webp',
  'assets/about-career-abstract.webp',
  'assets/about-tools-stars.webp',
  'assets/about-advantage-space.webp',
  ...['lingma-content-desktop', 'lingma-content-mobile', 'lingma-footer-glow-desktop', 'lingma-footer-glow-mobile']
    .map(name => `assets/backgrounds/${name}.webp`),
];

test('首屏和介绍区使用真实 WebP 文件，原图仍保留', async () => {
  for (const relative of webpFiles) {
    const bytes = await readFile(new URL(relative, root));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', relative);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', relative);
    const original = relative.replace(/\.webp$/, relative.includes('about-advantage-space') ? '.jpg' : '.png');
    assert.ok((await stat(new URL(original, root))).size > 0, original);
  }
});

test('项目 WebP 小图和详情图均存在，发布用小图总量小于 JPG', async () => {
  const projectPages = { 'lecai-ai': 12, 'ai-agent': 13, 'caiyun': 12 };
  let jpgPreviewBytes = 0;
  let webpPreviewBytes = 0;
  for (const [project, count] of Object.entries(projectPages)) {
    for (const name of ['cover', ...Array.from({ length: count }, (_, index) => String(index + 1).padStart(2, '0'))]) {
      const full = `assets/project-images/${project}/${name}`;
      const original = await stat(new URL(`${full}.jpg`, root));
      const optimized = await readFile(new URL(`${full}.webp`, root));
      assert.ok(original.size > 0);
      assert.equal(optimized.toString('ascii', 8, 12), 'WEBP', full);
      const preview = `assets/project-previews/${project}/${name}`;
      let jpg;
      try { jpg = await stat(new URL(`${preview}.jpg`, root)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (jpg) {
        const webp = await readFile(new URL(`${preview}.webp`, root));
        jpgPreviewBytes += jpg.size;
        webpPreviewBytes += webp.length;
        assert.equal(webp.toString('ascii', 8, 12), 'WEBP', preview);
      } else {
        assert.ok(name !== 'cover', `${preview}.webp 缺失`);
      }
    }
  }
  assert.ok(webpPreviewBytes > 0 && webpPreviewBytes < jpgPreviewBytes);
});
