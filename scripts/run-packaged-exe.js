const { spawn } = require('child_process');
const path = require('path');

const exePath = path.resolve(__dirname, '../dist/win-unpacked/EXMARK ERP.exe');
console.log('Spawning exe:', exePath);

const child = spawn(exePath, ['--enable-logging'], {
  windowsHide: false,
  stdio: ['inherit', 'pipe', 'pipe']
});

child.stdout.on('data', (d) => {
  console.log('[EXE STDOUT]:', d.toString());
});

child.stderr.on('data', (d) => {
  console.error('[EXE STDERR]:', d.toString());
});

child.on('error', (err) => {
  console.error('[EXE ERROR]:', err);
});

child.on('close', (code, signal) => {
  console.log(`[EXE CLOSED]: code=${code} signal=${signal}`);
});

setTimeout(() => {
  console.log('Terminating test run after 8s...');
  child.kill();
  process.exit(0);
}, 8000);
