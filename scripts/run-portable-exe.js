/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const fs = require('fs');
const { verifyPackagedExecutable } = require('./lib/verifyExeHelper');

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const exePath = path.resolve(__dirname, `../dist/EXMARK ERP ${pkg.version}.exe`);

verifyPackagedExecutable({
  exePath,
  label: `PORTABLE WINDOWS EXE (EXMARK ERP ${pkg.version}.exe)`,
  testPort: Number(process.env.TEST_EXE_PORT || 4031),
  timeoutMs: 240000,
})
  .then(() => {
    console.log(`\n✓ PASS: Portable Windows .exe v${pkg.version} verified end-to-end.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL:', err.message);
    process.exit(1);
  });
