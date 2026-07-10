/* eslint-env node */
/**
 * 人格测评 seam 表征测试：锁定 mapper / kind / 轮询 helper 的现有行为。
 * 运行：node scripts/test-personality-seams.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function fail(message) {
  console.error(`[personality-seams] ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`${message}\n  expected: ${expectedJson}\n  actual:   ${actualJson}`);
  }
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options
    );
  }
  if (request === '@tarojs/taro' || request === '@tarojs/components') {
    return originalResolveFilename.call(
      this,
      path.join(__dirname, 'stubs/taro-stub.js'),
      parent,
      isMain,
      options
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require('@babel/register')({
  extensions: ['.js', '.jsx'],
  ignore: [/node_modules/],
  babelrc: false,
  configFile: false,
  presets: [
    ['@babel/preset-env', { modules: 'commonjs', targets: { node: '16' } }],
  ],
});

const {
  normalizePersonalitySession,
  normalizeSubmitDone,
  normalizeReportStatus,
  extractPublishedModelList,
  normalizePersonalityModel,
  normalizePersonalityAssessmentRecord,
  isPersonalityAssessmentDoneStatus,
} = require('../src/services/api/personality/mappers');

const { normalizePersonalityReport } = require('../src/modules/assessment/services/personalityReportMapper');
const { pollAssessmentIdByAnswerSheet } = require('../src/modules/assessment/services/pollAssessmentIdByAnswerSheet');
const {
  isTypologyCatalogModel,
  isTypologyAssessmentModel,
  normalizeAssessmentKind,
  ASSESSMENT_KIND,
} = require('../src/shared/lib/assessmentKind');

const sessionFixture = readJson('src/modules/assessment/__fixtures__/personality-session.json');
const modelsFixture = readJson('src/modules/assessment/__fixtures__/personality-models-list.json');
const reportFixture = readJson('src/modules/assessment/__fixtures__/personality-report.json');
const submitAcceptedFixture = readJson('src/modules/assessment/__fixtures__/personality-submit-accepted.json');
const submitDoneFixture = readJson('src/modules/assessment/__fixtures__/personality-submit-status-done.json');

// --- mapper: session ---
{
  const session = normalizePersonalitySession(sessionFixture);
  assert(session.model.code === 'MBTI_OEJTS', 'session model.code');
  assert(session.model.kind === 'typology', 'session model.kind stays typology at catalog layer');
  assert(session.submitContract.questionnaire_code === 'MBTI_OEJTS_V1', 'session submit_contract questionnaire_code');
  assert(session.submitContract.testee_id === '10001', 'session submit_contract testee_id as string');
  assert(!session.submitContract.kind || session.submitContract.kind === 'typology', 'session submit_contract kind defaults typology');
}

// --- mapper: models list ---
{
  const models = extractPublishedModelList(modelsFixture);
  assert(models.length >= 5, 'models list length');
  assert(models.every((item) => item.kind === 'typology'), 'catalog models use kind=typology');

  const mbti = normalizePersonalityModel(models.find((item) => item.algorithm === 'mbti'));
  assert(mbti.algorithm === 'mbti', 'model algorithm');
  assert(mbti.productChannel === 'typology', 'model productChannel');
  assert(typeof mbti.id === 'string' || mbti.id === '', 'model id normalized to string when present');
}

// --- mapper: submit accepted / done ---
{
  const accepted = normalizeSubmitDone(submitAcceptedFixture);
  assertEqual(
    {
      answersheetId: '',
      assessmentId: '',
      requestId: 'req_personality_submit_001',
      status: 'queued',
    },
    {
      answersheetId: accepted.answersheetId,
      assessmentId: accepted.assessmentId,
      requestId: accepted.requestId,
      status: accepted.status,
    },
    'submit accepted normalization'
  );

  const done = normalizeSubmitDone(submitDoneFixture);
  assertEqual(
    {
      answersheetId: '90010001',
      assessmentId: '80020001',
      requestId: 'req_personality_submit_001',
      status: 'done',
    },
    {
      answersheetId: done.answersheetId,
      assessmentId: done.assessmentId,
      requestId: done.requestId,
      status: done.status,
    },
    'submit-status done normalization'
  );
}

// --- mapper: report status ---
{
  const status = normalizeReportStatus({ status: 'Processing', stage: 'interpreting', next_poll_after_ms: 1500 });
  assert(status.status === 'processing', 'report status lowercased');
  assert(status.stage === 'interpreting', 'report stage preserved');
  assert(status.nextPollAfterMs === 1500, 'report nextPollAfterMs');
}

// --- mapper: report body ---
{
  const vm = normalizePersonalityReport(reportFixture);
  assert(vm.modelTitle === '16 型人格测评', 'report modelTitle');
  assert(vm.outcome.code === 'ISTJ', 'report outcome from model_extra/type_code');
  assert(vm.hero.modelExtra.type_code === 'ISTJ', 'report model_extra.type_code');
  assert(vm.sections.length === 1, 'report sections from report_sections');
  assert(vm.hasContent === true, 'report hasContent');
}

// --- mapper: assessment record ---
{
  const record = normalizePersonalityAssessmentRecord({
    id: 8001,
    answer_sheet_id: 90010001,
    model: { kind: 'personality', code: 'MBTI_OEJTS', title: '16 型人格测评' },
    status: 'interpreted',
  });
  assert(record.id === '8001', 'record id string');
  assert(record.answer_sheet_id === '90010001', 'record answer_sheet_id string');
  assert(record.assessment_kind === 'personality', 'record assessment_kind personality at report layer');
  assert(record.kind === 'personality', 'record kind personality at report layer');
}

// --- kind semantics ---
{
  assert(isTypologyCatalogModel({ kind: 'typology' }), 'catalog typology');
  assert(isTypologyCatalogModel({ kind: 'personality' }), 'catalog personality alias');
  assert(!isTypologyCatalogModel({ kind: 'medical' }), 'catalog rejects medical');

  assert(isTypologyAssessmentModel({ kind: 'personality' }), 'assessment personality');
  assert(isTypologyAssessmentModel({ kind: 'typology' }), 'assessment typology read-compat');
  assert(normalizeAssessmentKind('typology') === ASSESSMENT_KIND.PERSONALITY, 'typology normalizes to personality kind');
}

// --- report wait terminal statuses (aligned with reportWaitStrategy + assessmentApi) ---
{
  assert(isPersonalityAssessmentDoneStatus('interpreted'), 'interpreted completes personality wait');
  assert(isPersonalityAssessmentDoneStatus('completed'), 'completed completes personality wait');
  assert(!isPersonalityAssessmentDoneStatus('processing'), 'processing not complete');
  assert(normalizeAssessmentKind('typology') === ASSESSMENT_KIND.PERSONALITY, 'WS/report kind uses personality not typology route');
}

// --- submit navigation ---
{
  const { buildPostSubmitRedirectUrl } = require('../src/modules/assessment/lib/assessmentSubmitNavigation');
  const { ASSESSMENT_KIND } = require('../src/shared/lib/assessmentKind');

  const personalityUrl = buildPostSubmitRedirectUrl({
    questionnaireType: 'PersonalityAssessment',
    isPersonalityFlow: true,
    answersheetId: '9001',
    assessmentId: '8001',
    requestId: 'req_1',
    testeeId: '10001',
    planTaskId: 'task_1',
  });
  assert(/kind=personality|kind%3Dpersonality/.test(personalityUrl), 'personality submit navigates with kind=personality');
  assert(/request_id=req_1|request_id%3Dreq_1/.test(personalityUrl), 'personality submit passes request_id');
  assert(normalizeAssessmentKind('typology') === ASSESSMENT_KIND.PERSONALITY, 'typology maps to personality for navigation kind');
}

// --- pollAssessmentIdByAnswerSheet ---
(async () => {
  const found = await pollAssessmentIdByAnswerSheet({
    testeeId: '10001',
    answerSheetId: '90010001',
    maxAttempts: 1,
    intervalMs: 0,
    fetchItems: async () => [
      { id: '80020001', answer_sheet_id: '90010001' },
      { id: '80020002', answer_sheet_id: '90010002' },
    ],
  });
  assert(found === '80020001', 'poll helper returns matching assessment_id');

  let attempts = 0;
  try {
    await pollAssessmentIdByAnswerSheet({
      testeeId: '10001',
      answerSheetId: 'missing',
      maxAttempts: 2,
      intervalMs: 0,
      fetchItems: async () => {
        attempts += 1;
        return [{ id: '1', answer_sheet_id: 'other' }];
      },
    });
    fail('poll helper should throw when no match');
  } catch (error) {
    assert(attempts === 2, 'poll helper retries until maxAttempts');
    assert(/测评记录生成时间过长/.test(error.message), 'poll helper timeout message');
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log('[personality-seams] ok');
})().catch((error) => {
  fail(error.stack || error.message);
  process.exit(process.exitCode || 1);
});
