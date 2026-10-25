import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { listReleaseFiles } from '../prepare-edgeone-release.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('EdgeOne 发布包只包含网站运行所需文件', async () => {
  const files = await listReleaseFiles(source);
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('assets/videos/hero-background-faststart.mp4'));
  assert.ok(!files.includes('assets/videos/hero-background.mp4'));
  assert.ok(files.includes('assets/wechat-qr-user.png'));
  assert.ok(files.includes('assets/project-images/lecai-ai/cover.webp'));
  assert.ok(files.includes('assets/project-images/ai-agent/13.webp'));
  assert.ok(files.includes('assets/project-images/caiyun/12.webp'));
  assert.ok(files.includes('assets/project-previews/caiyun/cover.webp'));
  assert.ok(files.includes('assets/hero-video-poster.webp'));
  assert.ok(!files.includes('assets/hero-title-mobile.webp'));
  assert.ok(files.includes('hero-metal-loader.mjs'));
  assert.ok(!files.some(file => /^assets\/project-(?:images|previews)\/.*\.jpg$/.test(file)));
  assert.ok(files.includes('vendor/paper-liquid-metal-0.0.78.iife.js'));
  assert.ok(files.includes('assets/licenses/paper-shaders-LICENSE.txt'));
  assert.ok(files.includes('assets/licenses/paper-shaders-NOTICE.txt'));
  assert.ok(!files.some(file => /(^|\/)(\.git|tests|docs|qa)(\/|$)/.test(file)));
  assert.ok(!files.some(file => /\.(md|map)$/.test(file)));
  assert.equal(new Set(files).size, files.length);
});
