import fs from 'fs';

let content = fs.readFileSync('types/corporateNavigation.ts', 'utf8');
content = content.replace('labelMl: string;', 'labelMl?: string;');

const lines = content.split('\n');
const filtered = lines.filter(l => !l.trim().startsWith('labelMl:'));

fs.writeFileSync('types/corporateNavigation.ts', filtered.join('\n'), 'utf8');
console.log('Successfully purged all labelMl lines from types/corporateNavigation.ts');
