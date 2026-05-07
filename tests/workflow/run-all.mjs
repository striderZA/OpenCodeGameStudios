#!/usr/bin/env node

import { fork } from 'child_process';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const suites = [
  { name: 'references', file: join(__dirname, 'references.mjs') },
  { name: 'paths',      file: join(__dirname, 'paths.mjs') },
  { name: 'gates',      file: join(__dirname, 'gates.mjs') },
  { name: 'invariants', file: join(__dirname, 'invariants.mjs') },
];

const SUITE_TIMEOUT = 30000;

async function runSuite(suite) {
  return new Promise((resolve) => {
    const child = fork(suite.file, [], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    let output = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ name: suite.name, output: output + '\nError: Suite timed out after 30s', code: 1 });
    }, SUITE_TIMEOUT);

    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { output += data.toString(); });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ name: suite.name, output, code });
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ name: suite.name, output: `Error: ${err.message}`, code: 1 });
    });
  });
}

async function main() {
  console.log('=== Workflow Integrity Test Suite ===\n');

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    const result = await runSuite(suite);
    results.push(result);
    if (result.code === 0) totalPassed++; else totalFailed++;
    console.log(result.output);
  }

  console.log('=' .repeat(50));
  console.log('SUITE RESULTS');
  console.log('=' .repeat(50));

  for (const r of results) {
    const status = r.code === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${status} ${r.name}`);
  }

  console.log(`\nOverall: ${totalPassed}/${results.length} suites passed\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
