const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const serverBundle = path.join(__dirname, '..', '..', 'dist', 'server.cjs');

if (!fs.existsSync(serverBundle)) {
  console.error(`[smoke-test] Error: dist/server.cjs not found at ${serverBundle}. Run build first.`);
  process.exit(1);
}

// 1. Static inspection of bundled exports
const bundleContent = fs.readFileSync(serverBundle, 'utf8');
if (bundleContent.includes('module.exports =') && bundleContent.includes('app:')) {
  console.error('\x1b[31m[smoke-test] CRITICAL FAILURE: dist/server.cjs exports "app"!\x1b[0m');
  console.error('This triggers Bun auto-serve crashes in Docker.');
  process.exit(1);
}

console.log('[smoke-test] Static analysis: dist/server.cjs has no forbidden exports.');

// 2. Runtime startup smoke test
console.log('[smoke-test] Spawning dist/server.cjs with PORT=3098 to verify startup stability...');
const child = spawn(process.execPath, [serverBundle], {
  env: {
    ...process.env,
    PORT: '3098',
    NODE_ENV: 'production',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let hasCrashed = false;

child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  output += data.toString();
});

child.on('error', (err) => {
  hasCrashed = true;
  console.error('[smoke-test] Failed to start server process:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (!killedIntentionally) {
    hasCrashed = true;
    console.error(`\x1b[31m[smoke-test] Server exited prematurely with code ${code}, signal ${signal}\x1b[0m`);
    console.error('Process output:\n', output);
    process.exit(1);
  }
});

let killedIntentionally = false;

setTimeout(() => {
  if (!hasCrashed) {
    killedIntentionally = true;
    child.kill('SIGTERM');
    console.log('\x1b[32m[smoke-test] PASS: Server started successfully and remained stable without crashing.\x1b[0m');
    process.exit(0);
  }
}, 1500);
