import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function atoms(bytes) {
  const result = [];
  for (let offset = 0; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    assert.ok(size >= 8 && offset + size <= bytes.length, 'MP4 atom size is valid');
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8), offset, data: bytes.subarray(offset + 8, offset + size) });
    offset += size;
  }
  return result;
}

test('首屏视频索引位于画面数据之前，且画面字节与原片完全一致', async () => {
  const source = await readFile(new URL('../assets/videos/hero-background.mp4', import.meta.url));
  const optimized = await readFile(new URL('../assets/videos/hero-background-faststart.mp4', import.meta.url));
  const sourceAtoms = atoms(source);
  const optimizedAtoms = atoms(optimized);
  const moov = optimizedAtoms.find(atom => atom.type === 'moov');
  const mdat = optimizedAtoms.find(atom => atom.type === 'mdat');

  assert.ok(moov && mdat && moov.offset < mdat.offset);
  assert.deepEqual(mdat.data, sourceAtoms.find(atom => atom.type === 'mdat').data);
  assert.ok(optimized.length <= source.length * 1.01);
});
