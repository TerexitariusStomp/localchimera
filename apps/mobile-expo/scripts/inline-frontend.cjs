const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../../qvac/frontend/dist/index.html');
const dest = path.join(__dirname, '../frontend-html.js');

if (!fs.existsSync(src)) {
  console.error('Built frontend not found:', src);
  console.error('Run: cd qvac/frontend && npm run build');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf-8');
const escaped = JSON.stringify(html);
const htmlModule = `// Auto-generated from qvac/frontend/dist/index.html. Do not edit manually.
export default ${escaped};
`;
fs.writeFileSync(dest, htmlModule);
console.log('Frontend HTML inlined into:', dest, `(${html.length} chars)`);
