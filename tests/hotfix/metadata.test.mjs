/** Exercises the delivered handlers and PNG bytes, not a Next.js server. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import { brandImageResponse } from '../../lib/metadata/brand-images.mjs';

async function loadHandler(name) {
  const file = new URL(`../../app/${name}.js`, import.meta.url);
  const source = fs.readFileSync(file, 'utf8');
  const helperURL = new URL('../../lib/metadata/brand-images.mjs', import.meta.url).href;
  const rewritten = source.replace('"../lib/metadata/brand-images.mjs"', JSON.stringify(helperURL));
  return import(`data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`);
}

function inspectPNG(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8, '8-bit image');
  assert.equal(bytes[28], 0, 'non-interlaced image');
  const channels = { 2: 3, 6: 4 }[bytes[25]];
  assert.ok(channels, 'RGB or RGBA image');
  let offset = 8, ended = false;
  const data = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    assert.ok(offset + 12 + length <= bytes.length, 'complete PNG chunk');
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    if (kind === 'IDAT') data.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (kind === 'IEND') { ended = true; break; }
  }
  assert.ok(ended, 'PNG terminator exists');
  assert.equal(offset, bytes.length, 'no trailing bytes');
  assert.equal(inflateSync(Buffer.concat(data)).length, height * (1 + width * channels));
  return { width, height };
}

for (const [name, size] of [['icon', {width:32,height:32}], ['apple-icon', {width:180,height:180}], ['opengraph-image', {width:1200,height:630}]]) {
  test(`${name}: declared metadata and response are PNG with correct dimensions`, async () => {
    const module = await loadHandler(name);
    assert.equal(module.runtime, 'nodejs');
    assert.equal(module.contentType, 'image/png');
    assert.deepEqual(module.size, size);
    const response = module.default();
    assert.ok(response instanceof Response);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'image/png');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.deepEqual(inspectPNG(Buffer.from(await response.arrayBuffer())), size);
  });
  test(`${name}: repeated requests never reuse a consumed response body`, async () => {
    const { default: handler } = await loadHandler(name);
    const first = handler(), second = handler();
    assert.notEqual(first, second);
    assert.deepEqual(Buffer.from(await first.arrayBuffer()), Buffer.from(await second.arrayBuffer()));
  });
}

test('unknown image identifiers fail instead of reading filesystem paths', () => {
  for (const name of ['missing', '../secret', '__proto__']) assert.throws(() => brandImageResponse(name), RangeError);
});

test('metadata handlers and helper have no runtime font renderer or filesystem dependency', () => {
  for (const relative of ['app/icon.js','app/apple-icon.js','app/opengraph-image.js','lib/metadata/brand-images.mjs']) {
    const source = fs.readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:from\s*|import\s*\()\s*["'](?:next\/og|@vercel\/og|node:fs|fs)["']/);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
  }
});
