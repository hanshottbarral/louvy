#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const command = process.argv[2];
if (!command) {
  console.error('Uso: node scripts/next-with-wasm.mjs <dev|build|start> [...args]');
  process.exit(1);
}

const extraArgs = process.argv.slice(3);
const env = { ...process.env };

if (process.platform === 'darwin' && process.arch === 'arm64') {
  try {
    const wasmPackageJson = require.resolve('@next/swc-wasm-nodejs/package.json');
    env.NEXT_TEST_WASM = env.NEXT_TEST_WASM ?? '1';
    env.NEXT_TEST_WASM_DIR = env.NEXT_TEST_WASM_DIR ?? wasmPackageJson.replace('/package.json', '');
  } catch {
    // If the wasm package is unavailable, Next will fall back to its default loader behavior.
  }
}

const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
