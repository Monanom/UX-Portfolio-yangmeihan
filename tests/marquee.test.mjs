import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const galleryHelper = html.match(/function projectGallery\([\s\S]*?\n}\n/)?.[0];
const projectData = html.match(/const PROJECTS = \[([\s\S]*?)\];\s*const OTHERS =/)?.[1];

test('滚动区按项目与页码顺序展示横向图片，排除长图', () => {
  const selector = html.match(/function selectMarqueeImages\([\s\S]*?\n}\n/)?.[0];
  assert.ok(galleryHelper && projectData && selector);
  const images = runInNewContext(`${galleryHelper}\nconst PROJECTS = [${projectData}];\n${selector}\nselectMarqueeImages(PROJECTS)`, {}, { timeout: 1000 });
  const paths = Array.from(images, image => image.src);
  assert.deepEqual(paths, [
    ...['cover','04','05','06','07','08','09','12'].map(page => `assets/project-images/lecai-ai/${page}.webp`),
    ...['cover','01','02','03','04','08','09','10','11','12','13'].map(page => `assets/project-images/ai-agent/${page}.webp`),
    ...['cover','01','02','04','10','11','12'].map(page => `assets/project-images/caiyun/${page}.webp`),
  ]);
  assert.ok(images.every(image => image.width / image.height >= 1.5));
});

test('滚动区两排反向滚动，图片和间距缩小约一半', () => {
  assert.match(html, /const marqueeImages = selectMarqueeImages\(PROJECTS\)/);
  assert.match(html, /fillRow\(document\.getElementById\('rowOne'\), marqueeImages\.slice\(0, marqueeMidpoint\)\)/);
  assert.match(html, /fillRow\(document\.getElementById\('rowTwo'\), marqueeImages\.slice\(marqueeMidpoint\)\)/);
  assert.match(html, /class="marquee-row reverse" id="rowOne"/);
  assert.match(html, /class="marquee-row" id="rowTwo"/);
  assert.match(html, /\.marquee-row\.reverse\{animation-name:slideR\}/);
  assert.match(html, /\.marquee\{[^}]*padding:calc\(var\(--section-space\)\*\.5\) 0 calc\(var\(--section-space\)\*\.3\)[^}]*gap:10px/);
  assert.match(html, /\.tile\{[^}]*width:clamp\(140px,16vw,230px\)[^}]*aspect-ratio:16\/9/);
  assert.match(html, /\.tile img\{[^}]*object-fit:contain/);
  assert.match(html, /@keyframes slideR\{from\{transform:translateX\(-50%\)\}to\{transform:translateX\(0\)\}\}/);
});

test('横向预览使用较小副本，详情继续引用原始图片', async () => {
  const selector = html.match(/function selectMarqueeImages\([\s\S]*?\n}\n/)?.[0];
  const previewHelper = html.match(/function projectPreviewSrc\([\s\S]*?\n}\n/)?.[0];
  assert.ok(galleryHelper && projectData && selector && previewHelper);
  const images = runInNewContext(`${galleryHelper}\nconst PROJECTS = [${projectData}];\n${selector}\n${previewHelper}\nselectMarqueeImages(PROJECTS).map(image => [image.src, projectPreviewSrc(image.src)])`, {}, { timeout: 1000 });
  assert.equal(images.length, 26);
  for(const [original, preview] of images){
    assert.equal(preview, original.replace('assets/project-images/', 'assets/project-previews/'));
    const [originalInfo, previewInfo] = await Promise.all([
      stat(new URL(`../${original}`, import.meta.url)),
      stat(new URL(`../${preview}`, import.meta.url)),
    ]);
    assert.ok(previewInfo.size < originalInfo.size, preview);
  }
  assert.match(html, /fillRow\(el, imgs\)\{[\s\S]*?src="\$\{projectPreviewSrc\(image\.src\)\}"/);
  assert.match(html, /class="project-image case-trigger"[\s\S]*?<img loading="lazy" decoding="async" src="\$\{projectPreviewSrc\(`assets\/\$\{p\.cover\}\.webp`\)\}"/);
});
