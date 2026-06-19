/**
 * Repo-to-Markdown Adapter
 *
 * Ports the core logic from upstream/puter-apps/repo-to-markdown/src/script.js
 * to Node.js so we can use it server-side for converting GitHub repos to
 * Markdown without cloning them first.
 *
 * Upstream: https://github.com/puter-apps/repo-to-markdown
 */

const DEFAULT_SKIP_PATTERNS = [
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

function parseRepositoryInput(repoUrlString) {
  let owner, repo, branch = null, subdirectory = '';
  const normalizeSubdirectory = (p) => p ? p.replace(/^\/+|\/+$/g, '') : '';

  if (repoUrlString.includes('github.com')) {
    const urlParts = new URL(repoUrlString);
    const pathParts = urlParts.pathname.split('/').filter(part => part);
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL format. Please provide a valid repository URL.');
    }
    owner = pathParts[0];
    repo = pathParts[1].replace(/\.git$/, '');

    if (pathParts.length > 2) {
      const routeType = pathParts[2];
      if ((routeType === 'tree' || routeType === 'blob') && pathParts.length > 3) {
        branch = pathParts[3];
        if (pathParts.length > 4) {
          subdirectory = normalizeSubdirectory(pathParts.slice(4).join('/'));
        }
      } else if (routeType === 'raw' && pathParts.length > 3) {
        branch = pathParts[3];
        subdirectory = normalizeSubdirectory(pathParts.slice(4).join('/'));
      } else {
        const specialRoutes = new Set(['issues', 'pulls', 'pull', 'actions', 'commits', 'releases']);
        if (!specialRoutes.has(routeType)) {
          subdirectory = normalizeSubdirectory(pathParts.slice(2).join('/'));
        }
      }
    }
  } else if (repoUrlString.split('/').length >= 2) {
    const parts = repoUrlString.split('/');
    owner = parts[0];
    repo = parts[1];
    if (parts.length > 2) {
      branch = parts[2];
      subdirectory = normalizeSubdirectory(parts.slice(3).join('/'));
    }
  } else {
    throw new Error('Invalid repository format. Use a GitHub URL or owner/repo format.');
  }

  return { owner, repo, branch, subdirectory };
}

async function getRepositoryFiles(repoUrlString) {
  const repoInfo = parseRepositoryInput(repoUrlString);
  const { owner, repo, branch, subdirectory } = repoInfo;
  const branchesToTry = branch ? [branch, 'main', 'master', 'dev', 'develop'] : ['main', 'master', 'dev', 'develop'];
  let workingBranch = null;
  let filesList = [];

  for (const branchToTry of branchesToTry) {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branchToTry}?recursive=1`;
      const treeResponse = await fetch(apiUrl);
      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        if (treeData.tree) {
          let allFiles = treeData.tree.filter(item => item.type === 'blob');
          if (subdirectory) {
            allFiles = allFiles.filter(item => item.path.startsWith(subdirectory + '/'));
          }
          filesList = allFiles;
          workingBranch = branchToTry;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (!workingBranch) {
    throw new Error(`Could not access repository "${owner}/${repo}". Please verify the repository exists and is public.`);
  }
  if (filesList.length === 0) {
    const locationDesc = subdirectory ? `subdirectory "${subdirectory}" in repository "${owner}/${repo}"` : `repository "${owner}/${repo}"`;
    throw new Error(`No files found in ${locationDesc}. Please verify the path exists.`);
  }

  return { ...repoInfo, files: filesList, branch: workingBranch };
}

function isBinaryFile(filename) {
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.dll',
    '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    '.ttf', '.otf', '.woff', '.woff2', '.eot'
  ];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return binaryExtensions.includes(ext);
}

function matchesGlob(filename, pattern) {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(filename) || filename.includes(pattern.toLowerCase());
}

function shouldSkipFile(file, options) {
  const filename = file.path.toLowerCase();
  const basename = filename.split('/').pop();

  if (options.skipLargeFiles && file.size > 1024 * 1024) {
    return true;
  }

  const skipPatterns = options.skipPatterns || DEFAULT_SKIP_PATTERNS;
  for (const pattern of skipPatterns) {
    if (matchesGlob(filename, pattern) || matchesGlob(basename, pattern)) {
      return true;
    }
  }

  if (isBinaryFile(file.path)) {
    return true;
  }

  return false;
}

function removeLicenseHeaders(content) {
  let cleanContent = content;
  const licenseKeywords = ['license', 'copyright', 'mit', 'apache', 'gpl', 'bsd'];
  const lines = cleanContent.split('\n');
  let startIndex = 0;

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (licenseKeywords.some(keyword => line.includes(keyword))) {
      if (line.includes('*/') || line.includes('-->')) {
        startIndex = i + 1;
        break;
      }
      if (line.startsWith('//') || line.startsWith('#')) {
        startIndex = i + 1;
        break;
      }
    }
    if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#') && !line.trim().startsWith('/*') && !line.trim().startsWith('*') && !line.trim().startsWith('<!--')) {
      break;
    }
  }

  if (startIndex > 0) {
    cleanContent = lines.slice(startIndex).join('\n');
  }
  cleanContent = cleanContent.replace(/^\s*\n+/, '');
  return cleanContent;
}

function generateDirectoryTree(files, subdirectory = '', options = {}) {
  const tree = {};
  const processedFiles = files.filter(file => !shouldSkipFile(file, options));

  processedFiles.forEach(file => {
    let currentPath = file.path;
    if (subdirectory && currentPath.startsWith(subdirectory + '/')) {
      currentPath = currentPath.substring(subdirectory.length + 1);
    }
    const parts = currentPath.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = (i === parts.length - 1) ? null : {};
      }
      current = current[part];
    }
  });

  function treeToString(node, prefix = '', isLast = true) {
    let result = '';
    const entries = Object.entries(node).sort(([a, valA], [b, valB]) => {
      const aIsDir = valA !== null;
      const bIsDir = valB !== null;
      if (aIsDir !== bIsDir) return bIsDir - aIsDir;
      return a.localeCompare(b);
    });

    entries.forEach(([name, value], index) => {
      const isLastItem = index === entries.length - 1;
      const connector = isLastItem ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ';
      result += prefix + connector + name + '\n';
      if (value !== null) {
        const newPrefix = prefix + (isLastItem ? '    ' : '\u2502   ');
        result += treeToString(value, newPrefix, isLastItem);
      }
    });

    return result;
  }

  return treeToString(tree);
}

async function downloadAndConcatenateFiles(repoData, options = {}) {
  const repositoryPath = repoData.subdirectory ? `${repoData.owner}/${repoData.repo}/${repoData.subdirectory}` : `${repoData.owner}/${repoData.repo}`;
  const directoryTree = generateDirectoryTree(repoData.files, repoData.subdirectory, options);

  let content = `This document contains the complete source code of the repository consolidated into a single file for streamlined AI analysis.

# Repository Overview

## Repository Information
- **Repository:** ${repositoryPath}
- **Branch:** ${repoData.branch}
- **Total Files:** ${repoData.files.length}
- **Generated:** ${new Date().toISOString()}

## Document Structure
The content is organized in the following sequence:
1. This overview section
2. Repository metadata and information
3. File system hierarchy
4. Individual source files, each containing:
   a. File path header
   b. Complete file contents within code blocks

## Important Notes
- Files excluded by filter rules are omitted
- Binary assets are not included
- Default ignore patterns have been applied to filter content
- Review content for sensitive information carefully

# Repository Structure

\`\`\`
${repositoryPath}/
${directoryTree}\`\`\`

`;

  let processedFiles = 0;
  let totalSize = 0;

  const filesToProcess = repoData.files.filter(file => !shouldSkipFile(file, options));
  let skippedFiles = repoData.files.length - filesToProcess.length;

  if (filesToProcess.length === 0) {
    throw new Error('No files to process after applying filters.');
  }

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    try {
      const rawUrl = `https://raw.githubusercontent.com/${repoData.owner}/${repoData.repo}/${repoData.branch}/${file.path}`;
      const displayPath = repoData.subdirectory && file.path.startsWith(repoData.subdirectory + '/')
        ? file.path.substring(repoData.subdirectory.length + 1)
        : file.path;

      const response = await fetch(rawUrl);
      if (response.ok) {
        let fileContent = await response.text();

        if (options.removeLicenseHeaders) {
          fileContent = removeLicenseHeaders(fileContent);
        }

        if (options.addSeparators) {
          content += `${'='.repeat(80)}\n`;
        }

        if (options.includeFilenames) {
          content += `// File: ${displayPath}\n`;
          if (options.addSeparators) {
            content += `${'='.repeat(80)}\n`;
          }
        }

        content += fileContent;
        if (!fileContent.endsWith('\n')) {
          content += '\n';
        }
        if (options.addSeparators) {
          content += '\n';
        }

        processedFiles++;
        totalSize += fileContent.length;
      } else {
        skippedFiles++;
      }
    } catch {
      skippedFiles++;
    }
  }

  const totalLines = content.split('\n').length;

  return {
    content,
    stats: {
      processed: processedFiles,
      skipped: skippedFiles,
      totalSize,
      totalLines,
    }
  };
}

/**
 * Convert a GitHub repository URL to a single Markdown document.
 *
 * @param {string} repoUrl - GitHub URL or owner/repo format
 * @param {object} options - Optional settings
 *   @param {string[]} options.skipPatterns - Extra glob patterns to skip
 *   @param {boolean} options.removeLicenseHeaders - Strip license headers
 *   @param {boolean} options.addSeparators - Add === separators between files
 *   @param {boolean} options.includeFilenames - Add // File: comments
 *   @param {boolean} options.skipLargeFiles - Skip files > 1MB
 * @returns {Promise<{content: string, stats: object}>}
 */
export async function convertRepoToMarkdown(repoUrl, options = {}) {
  const repoData = await getRepositoryFiles(repoUrl);
  return downloadAndConcatenateFiles(repoData, options);
}

/**
 * @deprecated Use convertRepoToMarkdown() directly.
 */
export async function repoToMarkdownUpstream(repoUrl, options = {}) {
  return convertRepoToMarkdown(repoUrl, options);
}
