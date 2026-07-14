/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const exceptions = new Set(require('./ui-asset-exceptions.json').legacyOversizedAssets || []);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const violations = [];

const limitFor = (relativePath) => {
  if (relativePath.includes('/banner/')) return 200 * 1024;
  if (relativePath.includes('/icon/')) return 32 * 1024;
  return 100 * 1024;
};

const walk = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolutePath);
    if (!imageExtensions.has(path.extname(entry.name).toLowerCase())) return;

    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    const bytes = fs.statSync(absolutePath).size;
    const limit = limitFor(relativePath);
    if (bytes > limit && !exceptions.has(relativePath)) {
      violations.push(`${relativePath}: ${(bytes / 1024).toFixed(1)} KiB > ${(limit / 1024).toFixed(0)} KiB`);
    }
  });
};

walk(sourceRoot);

for (const allowedPath of exceptions) {
  if (!fs.existsSync(path.join(root, allowedPath))) {
    violations.push(`${allowedPath}: 旧资源已删除，请同步缩减 exceptions`);
  }
}

if (violations.length) {
  console.error('[ui-assets] failed');
  violations.forEach((violation) => console.error(`[ui-assets] ${violation}`));
  process.exit(1);
}

console.log(`[ui-assets] ok (legacy oversized assets: ${exceptions.size})`);
