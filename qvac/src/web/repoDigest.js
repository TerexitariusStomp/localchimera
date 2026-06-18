import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Common patterns to ignore (similar to ai-digest defaults)
const DEFAULT_IGNORE = [
  'node_modules', '.git', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.next', 'out', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db', '.idea', '.vscode', '*.log',
  '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Cargo.lock', 'composer.lock', '.env', '.env.*', '*.min.js',
  '*.min.css', '*.map', '*.svg', '*.png', '*.jpg', '*.jpeg',
  '*.gif', '*.ico', '*.woff', '*.woff2', '*.ttf', '*.eot',
  '*.mp4', '*.mp3', '*.mov', '*.avi', '*.pdf', '*.zip',
  '*.tar', '*.gz', '*.rar', '*.7z', '*.exe', '*.dll', '*.so',
  '*.dylib', '*.bin', '*.o', '*.a', '*.class', '*.jar',
  '.gitignore', '.gitattributes', '.editorconfig', '.eslint*',
  '.prettier*', 'LICENSE', 'LICENSE.*', 'COPYING', 'AUTHORS',
  'CHANGELOG*', 'HISTORY*', 'CONTRIBUTING*', 'CODE_OF_CONDUCT*',
];

function shouldIgnore(filePath, relativePath, stats) {
  const basename = path.basename(filePath);
  const parts = relativePath.split(path.sep);

  // Skip hidden files/dirs (except .github)
  if (basename.startsWith('.') && basename !== '.github') return true;

  // Check directory names
  for (const part of parts) {
    if (DEFAULT_IGNORE.includes(part)) return true;
  }

  // Check basename patterns
  for (const pattern of DEFAULT_IGNORE) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(basename)) return true;
    } else if (basename === pattern) {
      return true;
    }
  }

  // Skip binary files by checking for null bytes in first 512 bytes
  if (stats && stats.size > 0 && stats.size < 1024 * 1024 * 5) { // < 5MB
    // We'll read first few bytes later; for now skip known binary extensions
    const ext = path.extname(basename).toLowerCase();
    const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.mov', '.avi', '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a', '.class', '.jar'];
    if (binaryExts.includes(ext)) return true;
  }

  // Skip very large files (> 500KB)
  if (stats && stats.size > 500 * 1024) return true;

  return false;
}

async function walkDir(dir, baseDir, results = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch { return results; }

  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(baseDir, full);

    if (ent.isDirectory()) {
      if (!shouldIgnore(full, rel, null)) {
        await walkDir(full, baseDir, results);
      }
    } else {
      let stats;
      try { stats = await fs.stat(full); } catch { continue; }
      if (!shouldIgnore(full, rel, stats)) {
        results.push({ path: rel, fullPath: full, size: stats.size });
      }
    }
  }
  return results;
}

async function generateDigest(dirPath) {
  const resolved = path.resolve(dirPath);
  const files = await walkDir(resolved, resolved);

  if (files.length === 0) {
    return { success: false, error: 'No readable text files found in the specified path' };
  }

  // Build tree
  const treeLines = [];
  for (const f of files) {
    treeLines.push(f.path);
  }

  let md = `# Repository Digest\n\n`;
  md += `<tree>\n${treeLines.join('\n')}\n</tree>\n\n`;
  md += `---\n\n`;

  for (const f of files) {
    let content;
    try {
      content = await fs.readFile(f.fullPath, 'utf-8');
    } catch {
      continue;
    }
    // Escape XML-like chars in content
    const safe = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    md += `<file path="${f.path}">\n${safe}\n</file>\n\n`;
  }

  return {
    success: true,
    data: {
      markdown: md,
      fileCount: files.length,
      rootDir: resolved,
    },
  };
}

async function cloneAndDigest(repoUrl, tempDir) {
  return new Promise((resolve, reject) => {
    const cloneDir = path.join(tempDir, `repo-${Date.now()}`);
    const proc = spawn('git', ['clone', '--depth', '1', repoUrl, cloneDir], {
      stdio: 'pipe',
      timeout: 120000,
    });

    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });

    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`git clone failed: ${err || `exit code ${code}`}`));
        return;
      }
      try {
        const result = await generateDigest(cloneDir);
        // Cleanup
        try { await fs.rm(cloneDir, { recursive: true, force: true }); } catch {}
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });

    proc.on('error', (e) => reject(new Error(`git not available: ${e.message}`)));
  });
}

export async function repoToMarkdown(input) {
  const { path: dirPath, url } = input;

  if (url) {
    // GitHub URL: try to clone
    const tmp = process.env.TMPDIR || '/tmp';
    try {
      return await cloneAndDigest(url, tmp);
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }
    } catch {
      return { success: false, error: 'Directory not found or not accessible' };
    }
    return generateDigest(dirPath);
  }

  return { success: false, error: 'Provide either path or url' };
}
