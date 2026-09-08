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
    const extension = path.extname(entry.name).toLowerCase();
    if (['.tsx', '.ts', '.jsx', '.js'].includes(extension)) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      // Local WebP decoding is not a cross-device Image guarantee. Keep SVG
      // artwork as sources, but ship raster versions to native Image elements.
      if (/\b(?:from\s*|import\s*|require\(\s*)['"][^'"]+\.(?:webp|svg)['"]/.test(source)) {
        violations.push(`${path.relative(root, absolutePath)}: 小程序运行图片请引用 PNG/JPEG，勿直接导入本地 WebP/SVG`);
      }
    }
    if (!imageExtensions.has(extension)) return;
    const header = fs.readFileSync(absolutePath).subarray(0, 12);
    const validHeader = extension === '.png' ? header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : extension === '.webp' ? header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP'
      : header[0] === 255 && header[1] === 216;
    if (!validHeader) violations.push(`${path.relative(root, absolutePath)}: 图片内容与扩展名不一致`);

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
