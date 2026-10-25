import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { buildRelease } from './prepare-edgeone-release.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const projectName = 'yangmeihan-portfolio';
const expectedOrigin = 'https://yangmeihan-portfolio-1wjybd3s.edgeone.cool/';

export function deploymentArguments(folder) {
  return {
    builtFolderPath: folder,
    workspacePath: folder,
    projectType: 'static',
    projectName,
  };
}

export function deploymentOrigin(url) {
  return `${new URL(url).origin}/`;
}

async function runChecks() {
  const tests = (await readdir(join(source, 'tests')))
    .filter(name => name.endsWith('.test.mjs'))
    .map(name => join(source, 'tests', name));
  await new Promise((done, fail) => {
    const child = spawn(process.execPath, ['--test', ...tests], { cwd: source, stdio: 'inherit' });
    child.on('error', fail);
    child.on('close', code => code === 0 ? done() : fail(new Error('页面检查未通过，已停止发布')));
  });
}

async function deployViaMcp(folder) {
  const child = spawn('npx', ['--yes', '@edgeone/makers-mcp@latest', '--region', 'china'], {
    cwd: folder,
    env: {
      ...process.env,
      EDGEONE_PAGES_PROJECT_NAME: projectName,
      npm_config_registry: 'https://registry.npmjs.org/',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require=${join(source, 'edgeone-write-guard.cjs')}`.trim(),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
  return await new Promise((done, fail) => {
    let settled = false;
    const timeout = setTimeout(() => { child.kill(); fail(new Error('EdgeOne 发布超过 10 分钟')); }, 600_000);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill();
      error ? fail(error) : done(result);
    };
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (!settled) finish(new Error(`EdgeOne 发布中断，退出码 ${code}`));
    });
    readline.createInterface({ input: child.stdout }).on('line', line => {
      let response;
      try { response = JSON.parse(line); } catch { return; }
      if (response.id === 1) {
        send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      } else if (response.id === 2) {
        const tool = response.result?.tools?.find(item => item.name === 'deploy_folder');
        if (!tool) return finish(new Error('官方 MCP 没有提供完整文件夹发布能力'));
        send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
          name: 'deploy_folder', arguments: deploymentArguments(folder),
        } });
      } else if (response.id === 3) {
        if (response.error || response.result?.isError) {
          return finish(new Error(JSON.stringify(response.error || response.result)));
        }
        try {
          const result = JSON.parse(response.result.content.find(item => item.type === 'text').text);
          if (!result.url) throw new Error('没有返回部署网址');
          finish(null, result);
        } catch (error) { finish(error); }
      } else if (response.method === 'notifications/message') {
        const message = String(response.params?.data || '');
        if (/Opening login page|Login successful|Deploy Success/.test(message)) console.log(message);
      }
    });
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-03-26', capabilities: {},
      clientInfo: { name: 'portfolio-publisher', version: '1.0.0' },
    } });
  });
}

async function verifyPublicSite(url) {
  const origin = deploymentOrigin(url);
  for (const path of ['', 'assets/wechat-qr-user.png', 'assets/videos/hero-background.mp4']) {
    const response = await fetch(origin + path, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`公开验收失败：${path || '首页'} 返回 ${response.status}`);
  }
  return origin;
}

async function main() {
  const action = process.argv[2] || '--prepare';
  if (!['--check-only', '--prepare', '--deploy'].includes(action)) {
    throw new Error('用法：node publish-edgeone.mjs [--check-only|--prepare|--deploy]');
  }
  await runChecks();
  if (action === '--check-only') return;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const folder = resolve(source, '..', 'output', `edgeone-release-${stamp}`);
  const build = await buildRelease(source, folder);
  console.log(`发布包：${folder}（${build.files} 个文件）`);
  if (action === '--prepare') return;
  const result = await deployViaMcp(folder);
  const origin = await verifyPublicSite(result.url);
  if (origin !== expectedOrigin) console.warn(`注意：公开域名已变化，原域名为 ${expectedOrigin}`);
  console.log(`公开网址：${origin}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
