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
  if (request === '@/store/tokenStore') {
    return originalResolveFilename.call(
      this,
      path.join(__dirname, 'stubs/token-store-stub.js'),
      parent,
      isMain,
      options
    );
  }
  if (request === '@/services/auth/sessionManager') {
    return originalResolveFilename.call(
      this,
      path.join(__dirname, 'stubs/session-manager-stub.js'),
      parent,
      isMain,
      options
    );
  }
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
const { normalizeSubmissionContext } = require('../src/modules/assessment/services/submissionContextStore');
const { resolveSubmissionAttempt } = require('../src/modules/assessment/services/submissionAttempt');
const { createRequestId } = require('../src/shared/lib/requestId');

const { normalizePersonalityReport } = require('../src/modules/assessment/services/personalityReportMapper');
const {
  getReportEventsCapability,
  REPORT_EVENTS_CAPABILITY,
  resetReportEventsCapability,
  watchReportViaWebSocket,
} = require('../src/modules/assessment/services/reportEventsClient');
const {
  resolvePollDelayMs,
  resolveRetryAfterMs,
  waitForReportReady,
} = require('../src/modules/assessment/services/waitForReportReady');
const { assertReportReadable, isReportReadable } = require('../src/modules/assessment/lib/reportReadiness');
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
const reportProcessingFixture = readJson('src/modules/assessment/__fixtures__/personality-report-status-processing.json');
const reportInterpretedFixture = readJson('src/modules/assessment/__fixtures__/personality-report-status-interpreted.json');
const reportFailedFixture = readJson('src/modules/assessment/__fixtures__/personality-report-status-failed.json');

// --- mapper: session ---
{
  const session = normalizePersonalitySession(sessionFixture);
  assert(session.model.code === 'MBTI_OEJTS', 'session model.code');
  assert(session.model.kind === 'typology', 'session model.kind stays typology at catalog layer');
  assert(session.submitContract.questionnaire_code === 'MBTI_OEJTS_V1', 'session submit_contract questionnaire_code');
  assert(session.submitContract.testee_id === '10001', 'session submit_contract testee_id as string');
  assert(!session.submitContract.kind || session.submitContract.kind === 'typology', 'session submit_contract kind defaults typology');
}

// --- submission context: IDs and recovery fields ---
{
  const context = normalizeSubmissionContext({
    fingerprint: 'fp_1',
    request_id: 'req_1',
    idempotency_key: 'idem_1',
    testee_id: '618855887087350318',
    answersheet_id: 71001,
    assessment_id: 80001,
    phase: 'assessment_ready',
  });
  assert(context.fingerprint === 'fp_1', 'submission context fingerprint');
  assert(context.requestId === 'req_1', 'submission context requestId');
  assert(context.testeeId === '618855887087350318', 'submission context testeeId string');
  assert(context.answersheetId === '71001', 'submission context answersheetId string');
  assert(context.assessmentId === '80001', 'submission context assessmentId string');
  assert(context.phase === 'assessment_ready', 'submission context phase');
}

// --- submission attempt: retry reuses only the idempotency key; HTTP request IDs are per attempt ---
{
  const payload = {
    questionnaire_code: 'MBTI_OEJTS_V1',
    questionnaire_version: '1.0.0',
    testee_id: '618855887087350318',
    task_id: 'task_1',
    answers: [{ question_code: 'Q1', question_type: 'Radio', score: 1, value: '{"option":"A"}' }],
  };
  const first = resolveSubmissionAttempt(payload);
  const retry = resolveSubmissionAttempt(payload, first);
  const changed = resolveSubmissionAttempt({
    ...payload,
    answers: [{ ...payload.answers[0], value: '{"option":"B"}' }],
  }, first);
  const explicitlyNew = resolveSubmissionAttempt(payload, first, true);

  assert(retry.idempotencyKey === first.idempotencyKey, 'same answers reuse idempotency key');
  assert(!retry.requestId && !first.requestId, 'submission intent does not persist a reusable request ID');
  assert(changed.idempotencyKey !== first.idempotencyKey, 'changed answers rotate idempotency key');
  assert(explicitlyNew.idempotencyKey !== first.idempotencyKey, 'explicit new submission rotates idempotency key');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(createRequestId()), 'request ID is UUID v4');
}

// --- mapper: models list ---
{
  const models = extractPublishedModelList(modelsFixture);
  assert(models.length >= 5, 'models list length');
  assert(models.every((item) => item.kind === 'typology'), 'catalog models use kind=typology');

  const mbti = normalizePersonalityModel(models.find((item) => /^MBTI_/i.test(String(item.code || ''))));
  assert(mbti.algorithm === 'personality_typology', 'shared typology algorithm');
  assert(mbti.kind === 'typology' && mbti.algorithm === 'personality_typology', 'model canonical identity');
  assert(typeof mbti.id === 'string' || mbti.id === '', 'model id normalized to string when present');
}

// --- mapper: reliable submit accepted ---
{
	const accepted = normalizeSubmitDone(submitAcceptedFixture);
	assertEqual(
		{
			answersheetId: '90010001',
			assessmentId: '',
			requestId: 'req_personality_submit_001',
			status: 'accepted',
    },
    {
      answersheetId: accepted.answersheetId,
      assessmentId: accepted.assessmentId,
      requestId: accepted.requestId,
      status: accepted.status,
    },
		'reliable submit accepted normalization'
	);
}

// --- mapper: report status ---
{
  const status = normalizeReportStatus({ status: 'Processing', stage: 'interpreting', next_poll_after_ms: 1500 });
  assert(status.status === 'processing', 'report status lowercased');
  assert(status.stage === 'interpreting', 'report stage preserved');
  assert(status.nextPollAfterMs === 1500, 'report nextPollAfterMs');
  assert(normalizeReportStatus(reportProcessingFixture).status === 'processing', 'processing fixture status');
  assert(normalizeReportStatus(reportInterpretedFixture).status === 'interpreted', 'interpreted fixture status');
  assert(normalizeReportStatus(reportFailedFixture).reason === 'interpretation failed', 'failed fixture reason');
}

// --- mapper: report body ---
{
  const vm = normalizePersonalityReport(reportFixture);
  assert(vm.modelTitle === '16 型人格测评', 'report modelTitle');
  assert(vm.outcome.code === 'ISTJ', 'report outcome from model_extra/type_code');
  assert(vm.outcome.title === '物流师', 'report outcome from model_extra/type_name');
  assert(vm.outcome.summary === '务实可靠，注重秩序', 'report outcome from model_extra/one_liner');
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

  const pendingRecord = normalizePersonalityAssessmentRecord({
    id: 8002,
    answer_sheet_id: 90010002,
    model: { kind: 'personality', code: 'SBTI_FUN', title: 'SBTI 趣味人格测评' },
    status: 'submitted',
  });
  assert(pendingRecord.status === 'submitted', 'typology list keeps submitted records for home rendering');
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
  assert(!isPersonalityAssessmentDoneStatus('completed'), 'completed is not a current personality report terminal state');
  assert(!isPersonalityAssessmentDoneStatus('processing'), 'processing not complete');
  assert(normalizeAssessmentKind('typology') === ASSESSMENT_KIND.PERSONALITY, 'WS/report kind uses personality not typology route');
  assert(isReportReadable('interpreted'), 'interpreted report is readable');
  assert(!isReportReadable('completed'), 'completed is not a current report-read terminal state');
  try {
    assertReportReadable({ status: 'processing' });
    fail('processing report must not be readable');
  } catch (error) {
    assert(/报告尚未生成/.test(error.message), 'processing report read is rejected');
  }
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

  const abilityUrl = buildPostSubmitRedirectUrl({
    questionnaireType: 'BehavioralRating',
    assessmentKind: 'ability',
    answersheetId: '',
    assessmentId: '',
    requestId: 'req_ability_1',
    testeeId: '10001',
  });
  assert(/analysis|report|pending|wait/i.test(abilityUrl) || /request_id=req_ability_1|request_id%3Dreq_ability_1/.test(abilityUrl), 'ability submit navigates to report wait with request_id');
  assert(/kind=ability|kind%3Dability/.test(abilityUrl), 'ability submit navigates with kind=ability');
  assert(!/answersheet|response/i.test(abilityUrl.split('?')[0]), 'ability submit must not land on answersheet page');
}

// --- report waiting seams ---
(async () => {
  const createSocketTask = () => {
    const handlers = {};
    return {
      handlers,
      sent: [],
      closed: false,
      onOpen(handler) { handlers.open = handler; },
      onMessage(handler) { handlers.message = handler; },
      onError(handler) { handlers.error = handler; },
      onClose(handler) { handlers.close = handler; },
      send({ data }) { this.sent.push(JSON.parse(data)); },
      close() { this.closed = true; },
    };
  };

  // --- report-events: subscribe once after open and terminal status completes ---
  resetReportEventsCapability();
  const socket = createSocketTask();
  const wsResultPromise = watchReportViaWebSocket({
    assessmentId: '80020001',
    testeeId: '10001',
    kind: 'personality',
    shouldContinue: () => true,
    getToken: () => 'token',
    connectSocket: () => {
      setTimeout(() => {
        socket.handlers.open();
        socket.handlers.message({ data: JSON.stringify({ op: 'status', data: { status: 'interpreted' } }) });
      }, 0);
      return socket;
    },
  });
  const wsResult = await wsResultPromise;
  assert(wsResult.completed === true, 'WS interpreted status completes report wait');
  assertEqual(socket.sent, [{
    op: 'subscribe',
    assessment_id: '80020001',
    testee_id: '10001',
    kind: 'personality',
  }], 'WS sends exactly one subscribe frame');
  assert(socket.closed, 'WS closes after terminal status');
  assert(getReportEventsCapability() === REPORT_EVENTS_CAPABILITY.AVAILABLE, 'WS open marks capability available');

  // --- report-events: first-status timer starts after open, then falls back ---
  const delayedSocket = createSocketTask();
  const timeoutPromise = watchReportViaWebSocket({
    assessmentId: '80020002',
    testeeId: '10001',
    kind: 'medical',
    shouldContinue: () => true,
    firstStatusTimeoutMs: 5,
    getToken: () => 'token',
    connectSocket: () => {
      setTimeout(() => delayedSocket.handlers.open(), 15);
      return delayedSocket;
    },
  });
  const timeoutResult = await timeoutPromise;
  assert(timeoutResult.reason === 'first_status_timeout', 'WS first-status timeout starts after subscribe');
  assert(delayedSocket.sent.length === 1, 'delayed WS still subscribes before timing out');

  // --- report-events: a confirmed 404 is identified as WS-unavailable ---
  const unavailableSocket = createSocketTask();
  const unavailablePromise = watchReportViaWebSocket({
    assessmentId: '80020005',
    testeeId: '10001',
    kind: 'medical',
    shouldContinue: () => true,
    getToken: () => 'token',
    connectSocket: () => {
      setTimeout(() => unavailableSocket.handlers.error({ statusCode: 404 }), 0);
      return unavailableSocket;
    },
  });
  const unavailableResult = await unavailablePromise;
  assert(unavailableResult.unavailable === true, 'WS 404 confirms the report-events capability is unavailable');

  // --- HTTP fallback: honour server guidance and never poll faster than 500 ms ---
  assert(resolvePollDelayMs({ nextPollAfterMs: 200 }) === 500, 'report poll delay has a 500 ms floor');
  assert(resolvePollDelayMs({ nextPollAfterMs: 4500 }) === 4500, 'report poll delay honours next_poll_after_ms');
  assert(
    resolveRetryAfterMs({ retryAfterMs: 5000, data: { retry_after_ms: 4000 } }, 3000) === 5000,
    '429 retry delay uses the largest response header/body/default value'
  );

  // --- report wait: unavailable WS is cached and falls back to HTTP exactly once ---
  resetReportEventsCapability();
  let websocketAttempts = 0;
  let httpAttempts = 0;
  const strategy = {
    kind: 'personality',
    pollReportStatus: async () => {
      httpAttempts += 1;
      return { status: 'interpreted' };
    },
    isCompleted: (status) => status === 'interpreted',
    isFailed: () => false,
  };
  const fallbackResult = await waitForReportReady({
    strategy,
    assessmentId: '80020003',
    testeeId: '10001',
    shouldContinue: () => true,
    watchReport: async () => {
      websocketAttempts += 1;
      return { completed: false, unavailable: true, reason: 'connect_failed' };
    },
  });
  assert(fallbackResult.source === 'report-status', 'WS failure falls back to report-status');
  assert(websocketAttempts === 1 && httpAttempts === 1, 'fallback runs only one HTTP waiter');
  assert(getReportEventsCapability() === REPORT_EVENTS_CAPABILITY.UNAVAILABLE, 'unavailable WS is cached for this process');
  await waitForReportReady({
    strategy,
    assessmentId: '80020004',
    testeeId: '10001',
    shouldContinue: () => true,
    watchReport: async () => {
      websocketAttempts += 1;
      return { completed: false };
    },
  });
  assert(websocketAttempts === 1 && httpAttempts === 2, 'cached unavailable WS skips the next connection attempt');

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log('[personality-seams] ok');
})().catch((error) => {
  fail(error.stack || error.message);
  process.exit(process.exitCode || 1);
});
