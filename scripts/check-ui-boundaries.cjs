/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const allowlist = require('./ui-boundary-allowlist.json');
const legacyAllowed = new Set(allowlist.legacyUiImports || []);
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const violations = [];

const walk = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolutePath);
    if (!sourceExtensions.has(path.extname(entry.name))) return;

    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    const source = fs.readFileSync(absolutePath, 'utf8');
    const importsTaroify = /(?:from\s+|require\()\s*['"]@taroify\//.test(source);
    const importsLegacy = /(?:from\s+|require\()\s*['"]taro-ui(?:-fc)?['"]/.test(source);

    if (importsTaroify && !relativePath.startsWith('src/shared/ui/internal/taroify/')) {
      violations.push(`${relativePath}: Taroify 只能由 shared/ui/internal/taroify 导入`);
    }
    if (importsLegacy && !legacyAllowed.has(relativePath)) {
      violations.push(`${relativePath}: 禁止新增 taro-ui 或 taro-ui-fc 直接依赖`);
    }
  });
};

walk(sourceRoot);

for (const allowedPath of legacyAllowed) {
  if (!fs.existsSync(path.join(root, allowedPath))) {
    violations.push(`${allowedPath}: 兼容文件已删除，请同步缩减 allowlist`);
  }
}

if (violations.length) {
  console.error('[ui-boundaries] failed');
  violations.forEach((violation) => console.error(`[ui-boundaries] ${violation}`));
  process.exit(1);
}

console.log(`[ui-boundaries] ok (legacy compatibility files: ${legacyAllowed.size})`);
