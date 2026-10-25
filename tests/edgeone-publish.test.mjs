import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentArguments, deploymentOrigin } from '../publish-edgeone.mjs';

test('重复发布保持同一个项目名和静态站点类型', () => {
  const folder = '/example/release';
  assert.deepEqual(deploymentArguments(folder), {
    builtFolderPath: folder,
    workspacePath: folder,
    projectType: 'static',
    projectName: 'yangmeihan-portfolio',
  });
});

test('公开验收使用固定域名，不依赖临时访问参数', () => {
  assert.equal(
    deploymentOrigin('https://yangmeihan-portfolio-1wjybd3s.edgeone.cool?eo_token=example'),
    'https://yangmeihan-portfolio-1wjybd3s.edgeone.cool/',
  );
});
