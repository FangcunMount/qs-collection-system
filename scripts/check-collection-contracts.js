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
      paths.add(match[1]);
    }
  }
  return paths;
}

const yamlSource = read('docs/collection.yaml');
const yamlPaths = parseCollectionYamlPaths(yamlSource);

const requiredYamlPaths = [
  '/answersheets',
  '/typology-assessments',
  '/typology-models',
  '/assessments/trend',
];

requiredYamlPaths.forEach((yamlPath) => {
  if (!yamlPaths.has(yamlPath)) {
    fail(`collection.yaml must define path ${yamlPath}`);
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
  { pattern: /\/personality-/, message: 'collection API must not call legacy /personality-* paths' },
  { pattern: /\/answersheets\/\$\{[^}]+\}\/assessment/, message: 'collection API must not call deprecated /answersheets/{id}/assessment' },
  { pattern: /\/questionsheet\//, message: 'collection API must not call legacy /questionsheet/* paths' },
  { pattern: /\/writeAnswerSheet\//, message: 'collection API must not call legacy /writeAnswerSheet/* paths' },
  { pattern: /method:\s*['"]DELETE['"][\s\S]{0,120}\/testees\//, message: 'collection API must not call DELETE /testees/{id}' },
  {
    pattern: /request\(`\/assessments\/\$\{[^}]+\}`/,
    message: 'collection API must not call GET /assessments/{id} detail endpoint',
  },
  {
    pattern: /\/assessments\/\$\{[^}]+\}\/report[`'"]/,
    message: 'collection API must not call GET /assessments/{id}/report (use GET /assessments/{id}/scores per collection.yaml)',
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
const analysisApi = read('src/services/api/analysisApi.js');
const questionnaireSubmissionApi = read('src/services/api/questionnaireSubmissionApi.js');
const testeeApi = read('src/services/api/testeeApi.js');
const personalityAssessmentApi = read('src/services/api/personality/assessmentApi.js');
const personalityModelApi = read('src/services/api/personality/modelApi.js');

assertContains(assessmentApi, /COLLECTION_API_CAPABILITIES\.medicalAssessmentsList/, 'getAssessments must gate GET /assessments behind capability flag');
assertContains(read('src/modules/assessment/services/medicalAssessmentIdResolver.js'), /pollAssessmentIdByAnswerSheet/, 'medical resolver must use assessments list matching when available');

assertContains(assessmentApi, /getMedicalAssessmentReport|mapScoresToReportPayload/, 'assessment API must expose yaml-aligned medical report fetch via scores');
assertNotContains(analysisApi, /host:\s*config\.collectionHost[\s\S]{0,200}request\(/, 'analysisApi must not duplicate collectionHost requests');
assertNotContains(questionnaireSubmissionApi, /getQuestionnaireListLegacy|questionsheet/, 'questionnaire submission API must not keep legacy questionsheet paths');
assertNotContains(testeeApi, /deleteTestee/, 'testee API must not expose DELETE /testees/{id}');

assertNotContains(
  personalityAssessmentApi,
  /model_code:/,
  'typology-assessments list must only send testee_id per collection.yaml'
);
assertNotContains(personalityModelApi, /category,|keyword,/, 'typology-models list must not send undocumented query params');

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
