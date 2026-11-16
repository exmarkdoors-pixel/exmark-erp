/**
 * EXMARK ERP — Cross-Platform Production Server Runner
 * Compatible with Render.com, Cloud Linux containers, and Local Windows factory hosts.
 *
 * Automatically detects dynamic cloud assigned $PORT (e.g. Render 10000)
 * or defaults to 4000. Binds host strictly to 0.0.0.0 for external routing & healthchecks.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const port = process.env.PORT || '4000';
const host = process.env.HOSTNAME || '0.0.0.0';

console.log('========================================================================');
console.log('  EXMARK ERP — PRODUCTION NEXT.JS SERVER');
console.log('========================================================================');
console.log(`[Production Server] Binding Host: ${host}`);
console.log(`[Production Server] Listening Port: ${port}`);
console.log(`[Production Server] Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`[Production Server] Health Check: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api/health`);
console.log('========================================================================\n');

// Check if standalone server exists
const standaloneServer = path.join(projectRoot, '.next', 'standalone', 'server.js');
let child;

if (fs.existsSync(standaloneServer)) {
  console.log('[Production Server] Launching Next.js Standalone Runtime...');
  child = spawn(process.execPath, [standaloneServer], {
    cwd: path.join(projectRoot, '.next', 'standalone'),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
  });
} else {
  console.log('[Production Server] Launching via next start...');
  const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  child = spawn(nextCmd, ['next', 'start', '-H', host, '-p', String(port)], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
  });
}

child.on('error', (err) => {
  console.error('[Production Server] Failed to start server process:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== 0 && !signal) {
    console.error(`[Production Server] Server exited with code ${code}`);
    process.exit(code || 1);
  }
});

process.on('SIGINT', () => {
  if (child) child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM');
  process.exit(0);
});
