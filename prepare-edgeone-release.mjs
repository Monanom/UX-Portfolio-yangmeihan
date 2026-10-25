import { copyFile, lstat, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const rootFiles = [
  'index.html',
  'case-detail.mjs',
  'viewport-motion.mjs',
  'hero-metal-loader.mjs',
  'hero-liquid-metal.mjs',
  'hero-video.mjs',
  'ambient-field.mjs',
  'vendor/paper-liquid-metal-0.0.78.iife.js',
  'assets/licenses/paper-shaders-LICENSE.txt',
  'assets/licenses/paper-shaders-NOTICE.txt',
  'assets/backgrounds/lingma-content-desktop.webp',
  'assets/backgrounds/lingma-content-mobile.webp',
  'assets/backgrounds/lingma-footer-glow-desktop.webp',
  'assets/backgrounds/lingma-footer-glow-mobile.webp',
  'assets/about-tools-stars.webp',
  'assets/hero-video-poster.webp',
  'assets/videos/hero-background-faststart.mp4',
  'assets/wechat-icon.svg',
  'assets/wechat-avatar-cat.jpg',
  'assets/wechat-qr-user.png',
  'assets/about-portrait-id-badge.webp',
  'assets/about-career-abstract.webp',
  'assets/about-advantage-space.webp',
  'assets/case-dorami.jpg',
  'assets/case-brand-matrix.jpg',
  'assets/proj-govmall.jpg',
  'assets/proj-lemall.jpg',
  'assets/proj-sumall.jpg',
  'assets/proj-plugin.jpg',
  'assets/proj-supervision.jpg',
  'assets/proj-designclaw.jpg',
  'assets/proj-dataviz.jpg',
];
const projects = ['lecai-ai', 'ai-agent', 'caiyun'];
const imageRoots = ['assets/project-images', 'assets/project-previews'];
const maxFileBytes = 25 * 1024 * 1024;

export async function listReleaseFiles(source = sourceDir) {
  const files = [...rootFiles];
  for (const imageRoot of imageRoots) {
    for (const project of projects) {
      const folder = `${imageRoot}/${project}`;
      const entries = await readdir(join(source, folder), { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /^(cover|\d{2})\.jpg$/.test(entry.name)) continue; // 本地保留原图，不加入发布包。
        if (!entry.isFile() || !/^(cover|\d{2})\.webp$/.test(entry.name)) {
          throw new Error(`发布图片目录包含非预期文件：${folder}/${entry.name}`);
        }
        files.push(`${folder}/${entry.name}`);
      }
    }
  }
  files.sort();
  for (const file of files) {
    const info = await lstat(join(source, file));
    if (!info.isFile() || info.size > maxFileBytes) {
      throw new Error(`文件不存在或超过 25 MB：${file}`);
    }
  }
  return files;
}

export async function buildRelease(source, destination) {
  const files = await listReleaseFiles(source);
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination); // 不覆盖旧发布包，避免新旧资源混合。
  let bytes = 0;
  for (const file of files) {
    const from = join(source, file);
    const to = join(destination, file);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    bytes += (await stat(to)).size;
  }
  return { files: files.length, bytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const destination = resolve(process.argv[2] || join(sourceDir, '..', 'output', `edgeone-release-${stamp}`));
  const result = await buildRelease(sourceDir, destination);
  console.log(JSON.stringify({ destination, ...result }));
}
