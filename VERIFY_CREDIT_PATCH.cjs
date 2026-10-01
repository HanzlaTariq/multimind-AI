#!/usr/bin/env node
/** Run after merging this patch. Uses only Node built-ins; never reads .env. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CREDITS_PATCH_MANIFEST.json'), 'utf8'));
  const failures = [];
  for (const file of manifest.files) {
    const location = path.resolve(root, file.path);
    if (!location.startsWith(root + path.sep)) throw new Error('Unsafe manifest path');
    if (!fs.existsSync(location)) { failures.push(`${file.path}: missing`); continue; }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(location)).digest('hex');
    if (hash !== file.sha256) failures.push(`${file.path}: content differs from this patch`);
  }
  if (failures.length) {
    console.error('Some patch files are missing or differ:\n' + failures.join('\n'));
    console.error('A deliberate later edit also causes a hash mismatch; review before replacing it.');
    process.exitCode = 1;
  } else {
    console.log(`Verified ${manifest.files.length} patched files. No .env, fonts or dependencies were inspected.`);
    console.log('This is file verification only. Run the tests and a real application build separately.');
  }
} catch (error) {
  console.error('Patch verification failed:', error.message);
  process.exitCode = 1;
}
