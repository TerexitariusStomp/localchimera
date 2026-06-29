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

// Extract the main JS bundle from the inline script tag
let jsBundle = '';
let htmlWithoutJs = html;

// Match the main module script (Vite inlines as <script type="module" crossorigin>...</script>)
const mainScriptMatch = html.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/);
if (mainScriptMatch) {
  jsBundle = mainScriptMatch[1];
  htmlWithoutJs = html.replace(mainScriptMatch[0], '');
}

// Strip manifest link and service worker script from HTML
htmlWithoutJs = htmlWithoutJs
  .replace(/<link rel="manifest"[^>]*>/g, '')
  .replace(/<script>\s*if\s*\('serviceWorker'\s*in\s*navigator\)[\s\S]*?<\/script>/g, '');

const escapedHtml = JSON.stringify(htmlWithoutJs);
const escapedJs = JSON.stringify(jsBundle);

const htmlModule = `// Auto-generated from qvac/frontend/dist/index.html. Do not edit manually.
export const frontendHtml = ${escapedHtml};
export const frontendJs = ${escapedJs};
export default frontendHtml;
`;
fs.writeFileSync(dest, htmlModule);
console.log('Frontend HTML+JS inlined into:', dest, `(html: ${htmlWithoutJs.length} chars, js: ${jsBundle.length} chars)`);
