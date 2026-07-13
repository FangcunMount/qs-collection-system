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
const personalityCatalogService = read('src/modules/catalog/services/personalityCatalogService.js');
const assessmentRecordsPage = read('src/modules/assessment/pages/AssessmentRecordsPage.jsx');
const homeRecentAssessments = read('src/modules/assessment/services/loadRecentAssessments.js');

assertContains(appConfig, /root:\s*['"]pages\/catalog-medical['"]/, 'app config must register catalog-medical subpackage');
assertContains(appConfig, /root:\s*['"]pages\/catalog-personality['"]/, 'app config must register catalog-personality subpackage');
assertContains(appConfig, /root:\s*['"]pages\/catalog-ability['"]/, 'app config must register catalog-ability subpackage');
assertNotContains(appConfig, new RegExp('pages\\/tab\\/' + 'scales'), 'main package must not register the retired scale tab');
assertNotContains(appConfig, /personality\/index/, 'assessment subpackage must not register personality catalog page');
assertNotContains(appConfig, /ability\/index/, 'assessment subpackage must not register ability catalog page');

assertContains(routes, /tabScales:\s*["']\/pages\/catalog-medical\/index["']/, 'ROUTES must define tabScales as catalog-medical index');
assertContains(routes, /scaleList:\s*["']\/pages\/catalog-medical\/list\/index["']/, 'ROUTES must define scaleList as catalog-medical list');
assertContains(routes, /personalityCatalog:\s*["']\/pages\/catalog-personality\/index["']/, 'ROUTES must define personalityCatalog');
assertContains(routes, /abilityCatalog:\s*["']\/pages\/catalog-ability\/index["']/, 'ROUTES must define abilityCatalog');
assertContains(routes, /abilityCatalog:\s*\(params\)/, 'routes helper must define abilityCatalog');

assertContains(bottomMenu, /label:\s*["']首页["']/, 'BottomMenu must include 首页');
assertContains(bottomMenu, /label:\s*["']量表["']/, 'BottomMenu must include 量表');
assertContains(bottomMenu, /label:\s*["']报告["']/, 'BottomMenu must include 报告');
assertContains(bottomMenu, /routes\.assessmentRecords\(\{\s*kind:\s*ASSESSMENT_KIND\.MEDICAL\s*\}\)/, 'BottomMenu 报告 must open medical assessment reports');
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
assertContains(assessmentPortals, /home-(entry|child)-behavior\.(png|webp)/, 'ability portal must reference home entry image');

assertContains(homeProfileCard, /home-current-record-checklist\.png/, 'home current record card must reference checklist image');
assertContains(homeTabPage, /listHotPublishedAssessmentModels/, 'home page must load hot published assessment models');
assertContains(homeTabPage, /home-portal-card__art/, 'home page must render image-backed portal cards');
assertContains(homeTabPage, /assessmentKind: resolveAssessmentKind\(item\)/, 'home recent reports must preserve assessment kind');
assertContains(homeTabPage, /isPersonalityAssessmentKind\(assessmentKind\)/, 'home report navigation must route personality separately');
assertContains(homeRecentAssessments, /isReportReadable\(item\.status\)/, 'home recent reports must only expose readable reports');
assertNotContains(homeTabPage, /HomeStatusPanel/, 'home page must not import old HomeStatusPanel');
assertNotContains(homeTabStyle, /home-category-|home-scale-card-|home-recent-card-|home-status-panel|home-status-card/, 'home styles must not keep removed home modules');

assertNotContains(personalityCatalog, /MBTI/, 'PersonalityCatalogPage must not expose MBTI to users');
assertContains(personalityCatalog, /loadGroupedPersonalityCatalog/, 'PersonalityCatalogPage must load catalog from API service');
assertNotContains(personalityCatalog, /PERSONALITY_CATALOG_ITEMS|personalityModels/, 'PersonalityCatalogPage must not use hardcoded personality catalog');
assertContains(personalityCatalogService, /listPublishedPersonalityModels/, 'personality catalog service must use published models API');
assertNotContains(personalityCatalogService, /PERSONALITY_CATALOG_ITEMS|personalityModels/, 'personality catalog service must not use hardcoded catalog');
assertContains(assessmentRecordsPage, /useRouter/, 'AssessmentRecordsPage must read report kind from route params');
assertContains(assessmentRecordsPage, /ASSESSMENT_KIND\.MEDICAL/, 'AssessmentRecordsPage must default the report tab to medical assessments');
assertContains(assessmentRecordsPage, /assessmentKind=\{assessmentKind\}/, 'AssessmentRecordsPage must pass the resolved kind to the record loader');

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[portal-contracts] Portal navigation and route contracts are aligned');
