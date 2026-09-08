#!/usr/bin/env node
/** Repository-aware shortcuts; safe to invoke from any working directory. */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
let root;
try {
  root = execFileSync('git', ['-C', scriptDir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
} catch {
  console.error('dd: this helper must live inside the Dharmic Data Git repository.');
  process.exit(1);
}

const [command = 'help', ...args] = process.argv.slice(2);
const help = `Dharmic Data · ${root}

Run these from any directory:
  node ${JSON.stringify(scriptPath)} status
  node ${JSON.stringify(scriptPath)} build
  node ${JSON.stringify(scriptPath)} dev
  node ${JSON.stringify(scriptPath)} test
  node ${JSON.stringify(scriptPath)} review

build, dev, test and review use this repository's current npm scripts.
Extra arguments are forwarded after npm's -- separator.
`;

if (['help', '--help', '-h'].includes(command)) {
  console.log(help);
} else if (command === 'status') {
  if (args.length) {
    console.error('dd status does not accept additional arguments.');
    process.exit(1);
  }
  console.log(`Repository: ${root}`);
  try {
    execFileSync('git', ['-C', root, 'status', '--short', '--branch'], { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
} else if (['build', 'dev', 'test', 'review'].includes(command)) {
  const guard = `${root}:${command}`;
  if (process.env.DD_HELPER_ACTIVE === guard) {
    console.error(`dd: recursive ${command} invocation refused. Point the npm script at its actual tool.`);
    process.exit(1);
  }
  let scripts;
  try {
    scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
  } catch {
    console.error('dd: could not read this repository’s package.json.');
    process.exit(1);
  }
  if (typeof scripts?.[command] !== 'string' || !scripts[command].trim()) {
    console.error(`dd: npm script ${command} is not configured in this repository.`);
    process.exit(1);
  }
  if (/\bdd\.mjs\b/.test(scripts[command])) {
    console.error(`dd: npm script ${command} points back to dd.mjs; use the underlying command instead.`);
    process.exit(1);
  }
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', command, ...(args.length ? ['--', ...args] : [])], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, DD_HELPER_ACTIVE: guard },
  });
  child.once('error', () => { console.error('dd: npm could not start.'); process.exitCode = 1; });
  child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 130 : 1); });
} else {
  console.error(`dd: unknown command ${command}.\n${help}`);
  process.exitCode = 1;
}
