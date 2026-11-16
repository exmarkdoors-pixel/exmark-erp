/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { verifyPackagedExecutable } = require('./lib/verifyExeHelper');

const exePath = path.resolve(__dirname, '../dist/win-unpacked/EXMARK ERP.exe');

verifyPackagedExecutable({
  exePath,
  label: 'UNPACKED DESKTOP EXE (isolated outside workspace)',
  testPort: Number(process.env.TEST_EXE_PORT || 4029),
  timeoutMs: 120000,
  copyDirOutsideWorkspace: true,
})
  .then(() => {
    console.log('\n✓ PASS: Unpackaged Windows Desktop .exe verified end-to-end.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL:', err.message);
    process.exit(1);
  });
