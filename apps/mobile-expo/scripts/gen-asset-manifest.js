const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets/frontend/assets');
const manifestPath = path.join(__dirname, '../assets/frontend-asset-manifest.json');
const requireFilePath = path.join(__dirname, '../generated-asset-requires.js');

if (!fs.existsSync(assetsDir)) {
  console.error('Assets directory not found:', assetsDir);
  process.exit(1);
}

const files = [];
function scan(dir, relPath) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = relPath ? `${relPath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scan(fullPath, rel);
    } else {
      files.push(rel);
    }
  }
}
scan(assetsDir, '');

const manifest = { files };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Generate a JS file that requires all assets so Metro bundles them
let js = '// AUTO-GENERATED — do not edit\n';
js += '// Requires all frontend asset files so Metro bundles them\n';
js += 'const modules = {};\n';
for (const f of files) {
  // Convert filename to a safe key
  const key = f.replace(/[^a-zA-Z0-9]/g, '_');
  js += `modules[${JSON.stringify(f)}] = require(${JSON.stringify('./assets/frontend/assets/' + f)});\n`;
}
js += 'export default modules;\n';
fs.writeFileSync(requireFilePath, js);

console.log(`Generated manifest with ${files.length} files`);
console.log(`Generated require file: ${requireFilePath}`);
