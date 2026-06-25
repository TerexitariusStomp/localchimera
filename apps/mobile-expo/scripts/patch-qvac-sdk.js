const fs = require('fs');
const path = require('path');

// Patch @qvac/sdk's withMobileBundle.js to skip bare-posix missing prebuild errors
// bare-posix doesn't ship Android prebuilds but has a JS fallback (unsupported.js)
const target = path.join(__dirname, '..', 'node_modules', '@qvac', 'sdk', 'dist', 'expo', 'plugins', 'withMobileBundle.js');

if (!fs.existsSync(target)) {
  console.log('⚠️  withMobileBundle.js not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');

const oldCheck = `if (hasErrors(result)) {
        throw new BundleVerificationFailedError(generatedBundle, new Error(formatVerifyBundleResult(result)));
    }`;

const newCheck = `// Patched: ignore bare-posix missing prebuild on Android (no native prebuilds, JS fallback exists)
    const filteredIssues = result.issues.filter(i => !(i.code === 'missing-prebuild' && i.addon && i.addon.includes('bare-posix')));
    const filteredResult = { ...result, issues: filteredIssues };
    if (hasErrors(filteredResult)) {
        throw new BundleVerificationFailedError(generatedBundle, new Error(formatVerifyBundleResult(result)));
    }`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(target, content, 'utf8');
  console.log('✅ Patched withMobileBundle.js to skip bare-posix missing prebuild errors');
} else {
  console.log('⚠️  Could not find expected code block in withMobileBundle.js, patch may need updating');
}
