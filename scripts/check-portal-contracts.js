/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`[portal-contracts] ${message}`);
  process.exitCode = 1;
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    fail(message);
  }
}

function assertNotContains(source, pattern, message) {
  if (pattern.test(source)) {
    fail(message);
  }
}

const appConfig = read('src/app.config.js');
const routes = read('src/shared/config/routes.js');
const bottomMenu = read('src/shared/ui/BottomMenu/index.jsx');
const bottomMenuStyle = read('src/shared/ui/BottomMenu/index.less');
const assessmentPortals = read('src/shared/config/assessmentPortals.js');
const homeTabPage = read('src/modules/tab/pages/HomeTabPage.jsx');
const homeTabStyle = read('src/modules/tab/pages/HomeTabPage.less');
const homeProfileCard = read('src/modules/tab/components/home/HomeCurrentProfileCard.jsx');
const personalityCatalog = read('src/modules/catalog/pages/PersonalityCatalogPage.jsx');
const personalityModels = read('src/shared/config/personalityModels.js');

assertContains(appConfig, /'ability\/index'/, 'assessment subpackage must register ability/index');
assertContains(routes, /abilityCatalog:\s*["']\/pages\/assessment\/ability\/index["']/, 'ROUTES must define abilityCatalog');
assertContains(routes, /abilityCatalog:\s*\(params\)/, 'routes helper must define abilityCatalog');

assertContains(bottomMenu, /label:\s*["']首页["']/, 'BottomMenu must include 首页');
assertContains(bottomMenu, /label:\s*["']量表["']/, 'BottomMenu must include 量表');
assertContains(bottomMenu, /label:\s*["']报告["']/, 'BottomMenu must include 报告');
assertContains(bottomMenu, /label:\s*["']我的["']/, 'BottomMenu must include 我的');
assertNotContains(bottomMenu, /扫码测评/, 'BottomMenu must not include 扫码测评 tab');
assertNotContains(bottomMenuStyle, /menu-item--scan|scan-button|label--scan/, 'BottomMenu styles must not keep scan tab styles');

const bottomMenuLabels = bottomMenu.match(/label:\s*["']([^"']+)["']/g) || [];
if (bottomMenuLabels.length !== 4) {
  fail(`BottomMenu must define exactly 4 items, found ${bottomMenuLabels.length}`);
}

assertContains(assessmentPortals, /tabScales/, 'assessment portals must include medical scales route');
assertContains(assessmentPortals, /personalityCatalog/, 'assessment portals must include personality route');
assertContains(assessmentPortals, /abilityCatalog/, 'assessment portals must include ability route');
assertContains(assessmentPortals, /home-entry-medical-scale\.png/, 'medical portal must reference home entry image');
assertContains(assessmentPortals, /home-entry-personality\.png/, 'personality portal must reference home entry image');
assertContains(assessmentPortals, /home-entry-behavior\.png/, 'ability portal must reference home entry image');

assertContains(homeProfileCard, /home-current-record-checklist\.png/, 'home current record card must reference checklist image');
assertContains(homeTabPage, /getHotScales/, 'home page must load hot scales');
assertContains(homeTabPage, /home-portal-card__art/, 'home page must render image-backed portal cards');
assertNotContains(homeTabPage, /HomeStatusPanel/, 'home page must not import old HomeStatusPanel');
assertNotContains(homeTabStyle, /home-category-|home-scale-card-|home-recent-card-|home-status-panel|home-status-card/, 'home styles must not keep removed home modules');

assertNotContains(personalityCatalog, /MBTI/, 'PersonalityCatalogPage must not expose MBTI to users');
assertNotContains(personalityModels, /['"]MBTI['"]/, 'personalityModels user-facing strings must not include MBTI label');

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[portal-contracts] Portal navigation and route contracts are aligned');
