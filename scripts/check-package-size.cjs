/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'dist');
const appConfigPath = path.join(outputRoot, 'app.json');
const limitKiB = Number(process.env.MAIN_PACKAGE_LIMIT_KIB || 1800);
const baselineKiB = Number(process.env.PRE_REFACTOR_MAIN_KIB || 1224.74);

if (!fs.existsSync(appConfigPath)) {
  console.error('[package-size] dist/app.json 不存在，请先运行 npm run build:weapp');
  process.exit(1);
}

const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
const subPackages = appConfig.subPackages || appConfig.subpackages || [];
const subPackageRoots = subPackages
  .map((item) => String(item.root || '').replace(/^\/+|\/+$/g, ''))
  .filter(Boolean);

const files = [];

const walk = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      return;
    }

    const relativePath = path.relative(outputRoot, absolutePath).split(path.sep).join('/');
    const belongsToSubPackage = subPackageRoots.some((subpackageRoot) => (
      relativePath === subpackageRoot || relativePath.startsWith(`${subpackageRoot}/`)
    ));

    if (!belongsToSubPackage) {
      files.push({ relativePath, size: fs.statSync(absolutePath).size });
    }
  });
};

walk(outputRoot);

const mainBytes = files.reduce((sum, file) => sum + file.size, 0);
const mainKiB = mainBytes / 1024;
const deltaKiB = mainKiB - baselineKiB;
const topFiles = files.sort((a, b) => b.size - a.size).slice(0, 10);

console.log(`[package-size] main=${mainKiB.toFixed(2)} KiB limit=${limitKiB.toFixed(2)} KiB baseline=${baselineKiB.toFixed(2)} KiB delta=${deltaKiB >= 0 ? '+' : ''}${deltaKiB.toFixed(2)} KiB`);
topFiles.forEach((file) => {
  console.log(`[package-size] ${(file.size / 1024).toFixed(2)} KiB ${file.relativePath}`);
});

if (mainKiB > limitKiB) {
  console.error(`[package-size] 主包超过 ${limitKiB.toFixed(2)} KiB 门禁`);
  process.exit(1);
}

console.log('[package-size] ok');
