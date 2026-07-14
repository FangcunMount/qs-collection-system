/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.less', '.scss']);
const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const codeFiles = [];
const assetFiles = [];

const walk = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolutePath);
    const extension = path.extname(entry.name).toLowerCase();
    if (codeExtensions.has(extension)) codeFiles.push(absolutePath);
    if (assetExtensions.has(extension)) assetFiles.push(absolutePath);
  });
};

walk(sourceRoot);

const sources = codeFiles.map((file) => ({
  file,
  relative: path.relative(root, file).split(path.sep).join('/'),
  text: fs.readFileSync(file, 'utf8'),
}));
const allSource = sources.map(({ text }) => text).join('\n');
const outsideTokenSource = sources.filter(({ relative }) => relative !== 'src/styles/tokens.less');

const countMatches = (entries, pattern) => entries.reduce((total, { text }) => {
  const matches = text.match(pattern);
  return total + (matches ? matches.length : 0);
}, 0);

const legacyImports = countMatches(sources, /(?:from\s+|require\()\s*['"]taro-ui(?:-fc)?['"]/g);
const directTaroifyImports = sources.filter(({ relative, text }) => (
  !relative.startsWith('src/shared/ui/internal/taroify/')
  && /(?:from\s+|require\()\s*['"]@taroify\//.test(text)
)).length;
const literalColors = countMatches(outsideTokenSource, /#[0-9a-fA-F]{3,8}\b/g);
const gradients = countMatches(outsideTokenSource, /(?:linear|radial)-gradient\(/g);
const shadows = countMatches(outsideTokenSource, /\bbox-shadow\s*:/g);

const unusedCandidates = assetFiles
  .filter((file) => !allSource.includes(path.basename(file)))
  .map((file) => ({
    relative: path.relative(root, file).split(path.sep).join('/'),
    bytes: fs.statSync(file).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

console.log('[ui-governance] dependency/import report');
console.log(`[ui-governance] legacy UI imports: ${legacyImports}`);
console.log(`[ui-governance] business Taroify direct imports: ${directTaroifyImports}`);
console.log('[ui-governance] style debt report (outside tokens.less)');
console.log(`[ui-governance] literal colors: ${literalColors}`);
console.log(`[ui-governance] gradients: ${gradients}`);
console.log(`[ui-governance] box-shadow declarations: ${shadows}`);
console.log(`[ui-governance] asset files: ${assetFiles.length}`);
console.log(`[ui-governance] basename-unreferenced candidates: ${unusedCandidates.length}`);
unusedCandidates.slice(0, 20).forEach(({ relative, bytes }) => {
  console.log(`[ui-governance] unused-candidate ${bytes} B ${relative}`);
});
console.log('[ui-governance] note: unused candidates require manual confirmation for dynamic paths');
