/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  console.error(`[collection-personality-contracts] ${message}`);
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

const personalityApi = read('src/services/api/personality/index.js');
const sessionApi = read('src/services/api/personality/sessionApi.js');
const reportApi = read('src/services/api/personality/reportApi.js');
const modelApi = read('src/services/api/personality/modelApi.js');
const mappers = read('src/services/api/personality/mappers.js');
const answerSerializer = read('src/modules/questionnaire/lib/answerSerializer.js');
const reportMapper = read('src/modules/assessment/services/personalityReportMapper.js');
const reportWaitStrategy = read('src/modules/assessment/services/reportWaitStrategy.js');
const personalityCatalogService = read('src/modules/catalog/services/personalityCatalogService.js');
const personalityCatalog = read('src/modules/catalog/lib/personalityCatalog.js');
const mbtiVariants = read('src/modules/catalog/lib/mbtiVariants.js');
const submitFlow = read('src/modules/assessment/services/submitAssessmentFlow.js');
const modelsFixture = readJson('src/modules/assessment/__fixtures__/personality-models-list.json');
const sessionFixture = readJson('src/modules/assessment/__fixtures__/personality-session.json');
const reportFixture = readJson('src/modules/assessment/__fixtures__/personality-report.json');

assertContains(personalityApi, /listPublishedPersonalityModels/, 'personality adapter must export listPublishedPersonalityModels');
assertContains(personalityApi, /createPersonalitySession/, 'personality adapter must export createPersonalitySession');
assertContains(personalityApi, /waitPersonalityReport/, 'personality adapter must export waitPersonalityReport');
assertContains(personalityApi, /getPersonalityReport/, 'personality adapter must export getPersonalityReport');
assertContains(personalityApi, /normalizePersonalitySession/, 'personality adapter must export normalizePersonalitySession');

assertContains(sessionApi, /\/personality-assessment-sessions/, 'session API must call POST /personality-assessment-sessions');
assertContains(modelApi, /\/personality-models/, 'model API must call GET /personality-models');
assertContains(reportApi, /\/personality-assessments\//, 'report API must call personality assessment endpoints');
assertContains(reportApi, /wait-report/, 'report API must call wait-report endpoint');

assertContains(answerSerializer, /USE_JSON_ANSWER_VALUE\s*=\s*true/, 'answer serializer must default to JSON answer values');
assertContains(answerSerializer, /JSON\.stringify\(\{ option:/, 'radio answers must serialize to {"option":...}');

assertContains(reportWaitStrategy, /interpreted/, 'report wait strategy must treat interpreted as completed for personality');
assertContains(reportWaitStrategy, /pending/, 'report wait strategy must include pending stage text');

assertContains(reportMapper, /model_extra/, 'report mapper must read model_extra');
assertContains(reportMapper, /report_sections/, 'report mapper must read report_sections');
assertContains(reportMapper, /outcome/, 'report mapper must read outcome');

assertContains(modelApi, /extractPublishedModelList/, 'model API must parse published model list payload');
assertContains(modelApi, /getPublishedPersonalityModel[\s\S]*needToken:\s*true/, 'model detail API must send JWT');
assertContains(personalityCatalogService, /listPublishedPersonalityModels/, 'detail page should prefer public model list');
assertContains(mappers, /payload\.models|extractPublishedModelList/, 'model mapper must support data.models list shape');
assertContains(mappers, /algorithm/, 'model mapper must read backend algorithm');
assertContains(mappers, /family_code|familyCode/, 'model mapper must read backend family_code');
assertContains(mappers, /catalog_layout|catalogLayout/, 'model mapper must read backend catalog_layout');
assertContains(submitFlow, /waitForSubmitCompletion/, 'submit flow must poll submit-status when queued');

assertNotContains(personalityCatalogService, /PERSONALITY_CATALOG_ITEMS|personalityModels/, 'catalog service must not use hardcoded personality catalog');
assertNotContains(personalityCatalog, /ENNEA|BIG_FIVE|九型|大五|resolveCatalogIdentity/, 'catalog layout must follow backend fields only');
assertNotContains(mbtiVariants, /MBTI_FALLBACK_VARIANTS|startsWith\(['"]MBTI/, 'variant grouping must use backend family_code only');

if (!Array.isArray(modelsFixture.models) || modelsFixture.models.length < 5) {
  fail('personality-models-list fixture must include models array from collection-server');
}
if (!modelsFixture.models.some((item) => item.algorithm === 'mbti')) {
  fail('personality-models-list fixture must include mbti algorithm models');
}

if (!sessionFixture.submit_contract?.questionnaire_version) {
  fail('personality-session fixture must include submit_contract.questionnaire_version');
}
if (sessionFixture.submit_contract?.kind !== 'personality') {
  fail('personality-session fixture must include submit_contract.kind=personality');
}

if (!reportFixture.model_extra?.type_code) {
  fail('personality-report fixture must include model_extra.type_code');
}
if (!Array.isArray(reportFixture.report_sections) || !reportFixture.report_sections.length) {
  fail('personality-report fixture must include report_sections');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[collection-personality-contracts] ok');
