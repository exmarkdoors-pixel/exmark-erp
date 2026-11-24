import fs from 'fs';
import path from 'path';

const tableHits = [];

function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.next' || item.name === '.git' || item.name === 'dist') continue;
      scan(full);
    } else if (/\.(tsx|jsx)$/.test(item.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (/<table[\s>]/i.test(l)) {
          // Check preceding 5 lines for overflow
          const prev = lines.slice(Math.max(0, idx - 5), idx).join(' ');
          const hasOverflow = /overflow(-x)?-(auto|scroll)/.test(prev) || /overflow(-x)?-(auto|scroll)/.test(l);
          tableHits.push({
            file: full.replace(/\\/g, '/'),
            line: idx + 1,
            hasOverflow,
            tableLine: l.trim().slice(0, 100),
          });
        }
      });
    }
  }
}

scan('components');

const unwrapped = tableHits.filter(t => !t.hasOverflow);
console.log(`Total tables found: ${tableHits.length}`);
console.log(`Tables possibly without overflow wrapper: ${unwrapped.length}`);
unwrapped.forEach(u => {
  console.log(`- ${u.file}:${u.line} -> ${u.tableLine}`);
});
