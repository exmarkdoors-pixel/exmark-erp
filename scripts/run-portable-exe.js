const { spawn } = require('child_process');
const path = require('path');

const exePath = path.resolve(__dirname, '../dist/EXMARK ERP 0.1.0.exe');
console.log('Spawning portable exe:', exePath);

const child = spawn(exePath, ['--enable-logging'], {
  windowsHide: false,
  stdio: ['inherit', 'pipe', 'pipe']
});

child.stdout.on('data', (d) => {
  console.log('[PORTABLE STDOUT]:', d.toString());
});

child.stderr.on('data', (d) => {
  console.error('[PORTABLE STDERR]:', d.toString());
});

child.on('error', (err) => {
  console.error('[PORTABLE ERROR]:', err);
});

child.on('close', (code, signal) => {
  console.log(`[PORTABLE CLOSED]: code=${code} signal=${signal}`);
});

setTimeout(() => {
  console.log('Terminating portable test after 10s...');
  child.kill();
  process.exit(0);
}, 10000);
