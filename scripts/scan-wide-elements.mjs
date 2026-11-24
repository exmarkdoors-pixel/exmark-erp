import fs from 'fs';
import path from 'path';

const hits = [];

function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.next' || item.name === '.git' || item.name === 'dist') continue;
      scan(full);
    } else if (/\.(tsx|jsx|css)$/.test(item.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        // match min-w-[700px] or larger or w-[700px] or larger or inline style width
        const matches = l.match(/(?:min-w|w)-\[(\d+)px\]/g);
        if (matches) {
          matches.forEach(m => {
            const pxMatch = m.match(/\d+/);
            if (pxMatch) {
              const px = parseInt(pxMatch[0], 10);
              if (px >= 700) {
                hits.push({ file: full.replace(/\\/g, '/'), line: idx + 1, match: m, px, text: l.trim().slice(0, 140) });
              }
            }
          });
        }
      });
    }
  }
}

scan('components');
scan('app');

console.log(`Total fixed wide elements (>= 700px): ${hits.length}`);
hits.sort((a, b) => b.px - a.px);
hits.forEach(h => {
  console.log(`${h.file}:${h.line} [${h.match}] -> ${h.text}`);
});
