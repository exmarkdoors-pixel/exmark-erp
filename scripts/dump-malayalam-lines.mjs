import fs from 'fs';
import path from 'path';

const targetDirs = ['app', 'components', 'lib', 'types', 'public'];
const fileReport = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      scan(full);
    } else if (/\.(tsx|ts|jsx|js|css|json)$/.test(item.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (/[\u0D00-\u0D7F]/.test(content)) {
        const lines = content.split('\n');
        const matches = [];
        lines.forEach((l, idx) => {
          if (/[\u0D00-\u0D7F]/.test(l)) {
            matches.push({ line: idx + 1, text: l.trim() });
          }
        });
        if (matches.length > 0) {
          fileReport.push({
            file: full.replace(/\\/g, '/'),
            matches,
          });
        }
      }
    }
  }
}

targetDirs.forEach(scan);

console.log(`Total files with Malayalam: ${fileReport.length}`);
for (const item of fileReport) {
  console.log(`\n=== ${item.file} (${item.matches.length} matches) ===`);
  item.matches.slice(0, 8).forEach(m => {
    console.log(`  L${m.line}: ${m.text}`);
  });
  if (item.matches.length > 8) {
    console.log(`  ... and ${item.matches.length - 8} more`);
  }
}
