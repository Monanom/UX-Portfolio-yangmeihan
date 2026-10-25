import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = dirname(fileURLToPath(import.meta.url));
const projects = ['lecai-ai', 'ai-agent', 'caiyun'];
let generated = 0;

for(const project of projects){
  const sourceDirectory = join(root, 'assets', 'project-images', project);
  const previewDirectory = join(root, 'assets', 'project-previews', project);
  const files = (await readdir(sourceDirectory)).filter(name => name.endsWith('.jpg'));

  for(const name of files){
    const source = join(sourceDirectory, name);
    const { stdout } = await execFile('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', source]);
    const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if(!width || !height || width / height < 1.5) continue;

    await mkdir(previewDirectory, { recursive:true });
    const maxDimension = name === 'cover.jpg' ? '1280' : '600';
    await execFile('sips', [
      '-s', 'format', 'jpeg', '-s', 'formatOptions', '76',
      '-Z', maxDimension, source, '--out', join(previewDirectory, name),
    ]);
    generated += 1;
  }
}

console.log(`已生成 ${generated} 张横向预览图。`);
