/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const legacyApiPaths = [
  'src/services/api/personalityAssessmentApi.js',
  'src/services/api/personalityAssessments.js',
];

legacyApiPaths.forEach((relativePath) => {
  if (fs.existsSync(path.join(root, relativePath))) {
    fail(`${relativePath} must be removed; use @/services/api/personality instead`);
  }
});

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`[collection-contracts] ${message}`);
  process.exitCode = 1;
}

function assertNotContains(source, pattern, message) {
  if (pattern.test(source)) {
    fail(message);
  }
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    fail(message);
  }
}

function listJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listJsFiles(fullPath, files);
      continue;
    }
    if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseCollectionYamlPaths(yamlSource) {
  const paths = new Set();
  const pathBlock = yamlSource.match(/^paths:\n([\s\S]*?)^components:/m);
  if (!pathBlock) {
    fail('collection.yaml must define paths section');
    return paths;
  }

  const lines = pathBlock[1].split('\n');
  for (const line of lines) {
    const match = line.match(/^  (\/[^:]+):$/);
    if (match) {
      const path = match[1].replace(/^\/api\/v1(?=\/|$)/, '');
      paths.add(path || '/');
    }
  }
  return paths;
}

const yamlSource = read('docs/collection.yaml');
const reportWaitGuide = read('docs/12-小程序报告等待接入指南.md');
const miniProgramGuide = read('docs/15-小程序接入文档.md');
const yamlPaths = parseCollectionYamlPaths(yamlSource);

const requiredYamlPaths = [
  '/answersheets',
  '/typology-assessments',
  '/behavior-assessments',
  '/behavior-assessments/{id}',
  '/behavior-assessments/{id}/report',
  '/behavior-assessments/{id}/report-status',
  '/behavior-assessments/{id}/wait-report',
  '/typology-models',
  '/assessments/trend',
  '/assessment-models',
  '/assessment-models/hot',
  '/assessment-models/options',
];

requiredYamlPaths.forEach((yamlPath) => {
  if (!yamlPaths.has(yamlPath)) {
    fail(`collection.yaml must define path ${yamlPath}`);
  }
});

const retiredScalePath = `/${'scales'}`;
['', '/categories', '/hot', '/{code}'].map((suffix) => `${retiredScalePath}${suffix}`).forEach((legacyPath) => {
  if (yamlPaths.has(legacyPath)) {
    fail(`collection.yaml must not define retired path ${legacyPath}`);
  }
});

const apiDir = path.join(root, 'src');
const apiFiles = listJsFiles(apiDir);
const collectionApiSources = apiFiles
  .map((filePath) => ({
    relativePath: path.relative(root, filePath),
    source: fs.readFileSync(filePath, 'utf8'),
  }))
  .filter(({ source }) => source.includes('config.collectionHost') || source.includes('getAssessments('));

const servicesApiSources = collectionApiSources.filter(
  ({ relativePath }) => relativePath.startsWith('src/services/api/')
);
const combinedApiSource = servicesApiSources.map(({ source }) => source).join('\n');
const combinedSrcSource = collectionApiSources.map(({ source }) => source).join('\n');

const forbiddenPatterns = [
	{ pattern: new RegExp("[`'\\\"]\\/" + 'scales' + "(?:[/?`'\\\"])") , message: 'collection API must not call retired scale paths' },
  { pattern: /\/personality-/, message: 'collection API must not call legacy /personality-* paths' },
	{ pattern: /\/answersheets\/\$\{[^}]+\}\/assessment(?:[?`'"]|$)/, message: 'collection API must not call deprecated /answersheets/{id}/assessment' },
  { pattern: /\/questionsheet\//, message: 'collection API must not call legacy /questionsheet/* paths' },
  { pattern: /\/writeAnswerSheet\//, message: 'collection API must not call legacy /writeAnswerSheet/* paths' },
  { pattern: /method:\s*['"]DELETE['"][\s\S]{0,120}\/testees\//, message: 'collection API must not call DELETE /testees/{id}' },
  {
    pattern: /request\(`\/assessments\/\$\{[^}]+\}`/,
    message: 'collection API must not call GET /assessments/{id} detail endpoint',
  },
];

forbiddenPatterns.forEach(({ pattern, message }) => {
  assertNotContains(combinedSrcSource, pattern, message);
});

const assessmentsListAllowlist = new Set([
  'src/services/api/assessmentApi.js',
  'src/modules/assessment/services/loadMedicalAssessmentRecords.js',
  'src/modules/assessment/services/waitMedicalAssessmentId.js',
]);

const assessmentsListPattern = /[`'"]\/assessments\?|`'"]\/assessments[`'"]/;

collectionApiSources.forEach(({ relativePath, source }) => {
  if (assessmentsListAllowlist.has(relativePath)) {
    return;
  }
  if (assessmentsListPattern.test(source)) {
    fail(`${relativePath} must not call deprecated GET /assessments list (allowlist: assessmentApi + medical services only)`);
  }
});

const pageModuleSources = listJsFiles(path.join(root, 'src/modules'))
  .concat(listJsFiles(path.join(root, 'src/pages')))
  .filter((filePath) => !filePath.includes('__fixtures__'))
  .map((filePath) => ({
    relativePath: path.relative(root, filePath),
    source: fs.readFileSync(filePath, 'utf8'),
  }));

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

pageModuleSources.forEach(({ relativePath, source }) => {
  const code = stripJsComments(source);
  if (/['"`]\/typology-/.test(code)) {
    fail(`${relativePath} must not embed /typology-* REST paths (use personality facade)`);
  }
  if (/['"`]\/personality-/.test(code)) {
    fail(`${relativePath} must not embed legacy /personality-* REST paths`);
  }
});

const assessmentApi = read('src/services/api/assessmentApi.js');
const collectionApiCapabilities = read('src/shared/config/collectionApiCapabilities.js');
const analysisApi = read('src/services/api/analysisApi.js');
const questionnaireSubmissionApi = read('src/services/api/questionnaireSubmissionApi.js');
const testeeApi = read('src/services/api/testeeApi.js');
const personalityAssessmentApi = read('src/services/api/personality/assessmentApi.js');
const personalityModelApi = read('src/services/api/personality/modelApi.js');

assertContains(assessmentApi, /COLLECTION_API_CAPABILITIES\.medicalAssessmentsList/, 'getAssessments must gate GET /assessments behind capability flag');
assertNotContains(assessmentApi, /assessment_kind\s*:/, 'GET /assessments must not send undocumented assessment_kind query parameter');
assertContains(collectionApiCapabilities, /medicalAssessmentsList:\s*true/, 'medical report menu requires the documented assessments list capability');
assertContains(reportWaitGuide, /\/assessments\/\{id\}\/report/, 'report wait guide must use collection medical report endpoint');
assertNotContains(reportWaitGuide, /evaluations\/assessments\/\{id\}\/report/, 'report wait guide must not direct medical reports to apiserver');
assertNotContains(reportWaitGuide, /\['interpreted', 'failed', 'completed'\]/, 'report wait guide must not treat completed as a current success terminal state');
assertContains(miniProgramGuide, /优先订阅 WebSocket 报告状态/, 'mini-program guide must make WebSocket the default report waiter');
assertContains(miniProgramGuide, /关闭连接后降级到 `report-status`/, 'mini-program guide must forbid concurrent WS and polling');
assertContains(miniProgramGuide, /kind=scale&category=<category>/, 'mini-program guide must document the scale category catalog query');
assertContains(read('src/modules/assessment/services/waitMedicalAssessmentId.js'), /waitForAssessmentReadiness/, 'medical resolver must use answersheet readiness');

assertContains(assessmentApi, /getMedicalAssessmentReport|mapMedicalReportPayload/, 'assessment API must expose yaml-aligned medical report fetch');
assertNotContains(analysisApi, /host:\s*config\.collectionHost[\s\S]{0,200}request\(/, 'analysisApi must not duplicate collectionHost requests');
assertNotContains(questionnaireSubmissionApi, /getQuestionnaireListLegacy|questionsheet/, 'questionnaire submission API must not keep legacy questionsheet paths');
assertNotContains(testeeApi, /deleteTestee/, 'testee API must not expose DELETE /testees/{id}');

assertNotContains(
  personalityAssessmentApi,
  /model_code:/,
  'typology-assessments list must only send testee_id per collection.yaml'
);
assertNotContains(personalityModelApi, /category,|keyword,/, 'typology-models list must not send undocumented query params');

const assessmentModelCatalogApi = read('src/services/api/assessmentModelCatalogApi.js');
assertNotContains(assessmentModelCatalogApi, /baseURL\s*:/, 'assessment model catalog must use request host option');
assertNotContains(
  assessmentModelCatalogApi,
  /window_days|keyword|limit\s*:/,
  'assessment model catalog must not send undocumented query params'
);
assertContains(
  assessmentModelCatalogApi,
  /category,\s*\n\s*page,/,
  'assessment model catalog must send the documented category query parameter'
);
const scaleListPage = read('src/modules/catalog/pages/ScaleListPage.tsx');
assertContains(
  scaleListPage,
  /category:\s*selectedCategory\s*\|\|\s*undefined/,
  'scale list must pass its selected category to the model catalog'
);
assertNotContains(
  scaleListPage,
  /matchesScale(?:Filters|Search)\(scale,\s*searchText,\s*selectedCategory\)/,
  'scale list must not locally discard category-filtered catalog results'
);
const scaleCatalogHome = read('src/shared/config/scaleCatalogHome.js');
['adhd', 'td', 'asd', 'pressure', 'sii', 'efn', 'emt', 'slp'].forEach((category) => {
  assertContains(
    scaleCatalogHome,
    new RegExp(`value:\\s*['\"]${category}['\"]`),
    `scale catalogue must expose canonical ${category} category`
  );
});
assertContains(
  scaleListPage,
  /isVisibleInMedicalScaleCatalog\(scale\.category\)/,
  'scale list must exclude non-medical categories from the medical catalogue'
);
assertContains(
  assessmentModelCatalogApi,
  /needToken\s*=\s*false|needToken:\s*false/,
  'public assessment model catalog reads must be anonymous'
);

assertContains(read('src/services/api/assessmentReports.js'), /assessmentApi/, 'assessmentReports must re-export from assessmentApi');
assertNotContains(
  read('src/services/api/assessmentReports.js'),
  /getAssessmentByAnswersheetId/,
  'assessmentReports must not re-export deprecated getAssessmentByAnswersheetId'
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[collection-contracts] ok');
