#!/usr/bin/env node
'use strict';
/** File verification + installed-Mongoose/PNG checks. Never connects to MongoDB. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const filesOnly = process.argv.includes('--files-only');

function main() {
  const manifestPath = path.join(root, 'CREDIT_ICON_FIX_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let failed = 0;
  for (const entry of manifest.files) {
    if (path.isAbsolute(entry.path) || entry.path.split(/[\\/]/).includes('..')) {
      throw new Error('Unsafe manifest path');
    }
    const file = path.join(root, entry.path);
    if (!fs.existsSync(file)) {
      console.error(`MISSING: ${entry.path}`); failed++; continue;
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actual !== entry.sha256) { console.error(`DIFFERENT: ${entry.path}`); failed++; }
  }
  if (failed) {
    console.error(`\n${failed} file(s) are missing or different. Merge the hotfix into the project and keep custom edits backed up.`);
    return 1;
  }
  console.log(`File integrity: ${manifest.files.length} payload files match the hotfix.\n`);
  if (filesOnly) {
    console.log('FILES ONLY: Mongoose schema, database and website behavior have not been verified.');
    return 0;
  }
  if (!fs.existsSync(path.join(root,'package.json')) || !fs.existsSync(path.join(root,'lib/automationCredits/wallet.js'))) {
    console.error('Merge this update into your existing project root first. It is not a standalone project.');
    return 2;
  }
  let mongoose;
  try { mongoose = require('mongoose'); }
  catch {
    console.error('NOT VERIFIED: the existing project Mongoose dependency is not installed/resolvable.');
    console.error('Use the project folder with its installed dependencies; do not upgrade Mongoose just for this patch.');
    return 2;
  }
  console.log(`Testing with installed Mongoose ${mongoose.version}. No .env or MongoDB connection will be used.\n`);
  const result = spawnSync(process.execPath, ['--test',
    'tests/hotfix/credit-schema.test.cjs',
    'tests/hotfix/metadata.test.mjs',
    'tests/hotfix/ready-credit.test.mjs',
  ], { cwd: root, stdio: 'inherit', timeout: 60000 });
  if (result.error) { console.error(result.error.message); return 1; }
  if (result.status !== 0) return result.status || 1;
  console.log('\nSchema/query-casting and PNG response checks passed.');
  console.log('These checks do not test a live database or Next.js server.');
  console.log('Stop the old dev server, clear .next, restart, then test one tool run and Credit activity.');
  return 0;
}
try { process.exitCode = main(); }
catch (error) { console.error(`Verification failed: ${error.message}`); process.exitCode = 1; }
