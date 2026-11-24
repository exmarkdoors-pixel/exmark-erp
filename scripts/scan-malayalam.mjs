import fs from 'fs';
import path from 'path';

const targetDirs = ['app', 'components', 'lib', 'types', 'public'];
const results = [];
const fontHits = [];

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
        let count = 0;
        lines.forEach(l => { if (/[\u0D00-\u0D7F]/.test(l)) count++; });
        results.push({ file: full.replace(/\\/g, '/'), count });
      }
      if (/malayalam|gayathri|manjari|anek|chilanka/i.test(content)) {
        fontHits.push(full.replace(/\\/g, '/'));
      }
    }
  }
}

targetDirs.forEach(scan);

console.log('=== FILES WITH MALAYALAM FONT REFERENCES ===');
console.log(Array.from(new Set(fontHits)));

console.log(`\n=== FILES WITH MALAYALAM UNICODE CHARACTERS (${results.length} files) ===`);
results.forEach(r => console.log(`${r.file}: ${r.count} lines`));
