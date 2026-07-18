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
const personalityAssessmentApi = read('src/services/api/personality/assessmentApi.js');
const mappers = read('src/services/api/personality/mappers.js');
const answerSerializer = read('src/modules/questionnaire/lib/answerSerializer.js');
const reportMapper = read('src/modules/assessment/services/personalityReportMapper.js');
const reportWaitStrategy = read('src/modules/assessment/services/reportWaitStrategy.js');
const personalityCatalogService = read('src/modules/catalog/services/personalityCatalogService.js');
const personalityCatalog = read('src/modules/catalog/lib/personalityCatalog.js');
const mbtiVariants = read('src/modules/catalog/lib/mbtiVariants.js');
const submitFlow = read('src/modules/assessment/services/submitAssessmentFlow.js');
const questionnaireSubmissionApi = read('src/services/api/questionnaireSubmissionApi.js');
const submissionAttempt = read('src/modules/assessment/services/submissionAttempt.js');
const requestId = read('src/shared/lib/requestId.js');
const waitTypologyAssessmentId = read('src/modules/assessment/services/waitTypologyAssessmentId.js');
const waitAssessmentReportLifecycle = read('src/modules/assessment/services/waitAssessmentReportLifecycle.js');
const answersheetApi = read('src/services/api/answersheetApi.js');
const reportEventsClient = read('src/modules/assessment/services/reportEventsClient.js');
const waitForReportReady = read('src/modules/assessment/services/waitForReportReady.js');
const personalityReportPage = read('src/modules/assessment/pages/PersonalityReportPage.tsx');
const loadPersonalityReportService = read('src/modules/assessment/services/loadPersonalityReport.js');
const homeTabPage = read('src/modules/tab/pages/HomeTabPage.tsx');
const loadRecentAssessmentsService = read('src/modules/assessment/services/loadRecentAssessments.js');
const loadMedicalRecordsService = read('src/modules/assessment/services/loadMedicalAssessmentRecords.js');
const assessmentRecordsPage = read('src/modules/assessment/pages/AssessmentRecordsPage.tsx');
const medicalReportPage = read('src/modules/assessment/pages/AssessmentReportPage.tsx');
const loadMedicalReportService = read('src/modules/assessment/services/loadMedicalReport.js');
const reportReadiness = read('src/modules/assessment/lib/reportReadiness.js');
const assessmentFillPage = read('src/modules/assessment/pages/AssessmentFillPage.tsx');
const assessmentFillEntry = read('src/modules/assessment/lib/assessmentFillEntry.js');
const assessmentSubmitNavigation = read('src/modules/assessment/lib/assessmentSubmitNavigation.js');
const medicalAssessmentApi = read('src/services/api/assessmentApi.js');
const analysisApi = read('src/services/api/analysisApi.js');
const modelsFixture = readJson('src/modules/assessment/__fixtures__/personality-models-list.json');
const sessionFixture = readJson('src/modules/assessment/__fixtures__/personality-session.json');
const reportFixture = readJson('src/modules/assessment/__fixtures__/personality-report.json');
const submitAcceptedFixture = readJson('src/modules/assessment/__fixtures__/personality-submit-accepted.json');

assertContains(personalityApi, /listPublishedPersonalityModels/, 'personality adapter must export listPublishedPersonalityModels');
assertContains(personalityApi, /listPersonalityAssessments/, 'personality adapter must export listPersonalityAssessments');
assertContains(mappers, /normalizePersonalityAssessmentRecord/, 'personality mapper must normalize assessment records');
assertContains(
  read('src/modules/assessment/services/personalityAssessmentRecordService.js'),
  /listPersonalityAssessments/,
  'personality record service must use typology-assessments API'
);
assertContains(personalityApi, /createPersonalitySession/, 'personality adapter must export createPersonalitySession');
assertContains(personalityApi, /waitPersonalityReport/, 'personality adapter must export waitPersonalityReport');
assertContains(personalityApi, /getPersonalityReport/, 'personality adapter must export getPersonalityReport');
assertContains(personalityApi, /normalizePersonalitySession/, 'personality adapter must export normalizePersonalitySession');

assertContains(sessionApi, /\/typology-assessment-sessions/, 'session API must call POST /typology-assessment-sessions');
assertContains(modelApi, /\/typology-models/, 'model API must call GET /typology-models');
assertContains(personalityAssessmentApi, /\/typology-assessments/, 'assessment API must call GET /typology-assessments');
assertContains(reportApi, /\/typology-assessments\//, 'report API must call typology assessment endpoints');
assertContains(reportApi, /report-status/, 'report API must call report-status endpoint');
assertContains(reportApi, /wait-report/, 'report API must call wait-report endpoint for legacy compatibility');
assertContains(reportWaitStrategy, /isInterpreted/, 'new report wait strategy must use interpreted as the only success status');
assertNotContains(reportWaitStrategy, /waitPersonalityReport|waitAssessmentReport/, 'new report wait strategy must not call legacy wait-report');
assertNotContains(reportWaitStrategy, /completed:\s*['"]报告已生成/, 'new report strategy must not treat completed as a current terminal state');

assertNotContains(sessionApi, /\/personality-/, 'session API must not call legacy /personality-* paths');
assertNotContains(modelApi, /\/personality-/, 'model API must not call legacy /personality-* paths');
assertNotContains(personalityAssessmentApi, /\/personality-/, 'assessment API must not call legacy /personality-* paths');
assertNotContains(reportApi, /\/personality-/, 'report API must not call legacy /personality-* paths');

assertContains(waitTypologyAssessmentId, /waitForAssessmentReadiness/, 'waitTypologyAssessmentId must use answersheet readiness');
assertContains(waitAssessmentReportLifecycle, /waitForAssessmentReadiness/, 'lifecycle must resolve assessment_id via readiness');
assertNotContains(waitAssessmentReportLifecycle, /submit-status|ListFallback|list fallback/i, 'lifecycle must not use removed submit-status or list fallback');
assertContains(waitAssessmentReportLifecycle, /waitForReportReady/, 'lifecycle must delegate report waiting to waitForReportReady');
assertContains(answersheetApi, /assessment-readiness/, 'answersheet API must query assessment readiness');
assertNotContains(answersheetApi, /submit-status/, 'answersheet API must not call removed submit-status');
assertContains(read('src/modules/assessment/pages/AssessmentReportPendingPage.tsx'), /request_id/, 'pending page must pass request_id into lifecycle');
assertContains(submitFlow, /answersheet_id/, 'submit flow must require the reliable answersheet id');
assertContains(questionnaireSubmissionApi, /resolveSubmissionAttempt/, 'questionnaire submit must resolve a reusable submission attempt');
assertContains(questionnaireSubmissionApi, /requestId:\s*submissionAttempt\.requestId/, 'questionnaire submit must pass the client request ID to answersheet submit');
assertContains(submissionAttempt, /fingerprint/, 'submission attempt must use an answer snapshot fingerprint');
assertContains(submissionAttempt, /forceNewAttempt/, 'submission attempt must support explicit new submissions');
assertContains(requestId, /createUuidV4/, 'request IDs must be UUID v4 values');
assertContains(read('src/modules/assessment/services/submissionContextStore.js'), /SUBMISSION_CONTEXT_STORAGE_KEY/, 'assessment submissions must persist recoverable context');
assertNotContains(reportEventsClient, /answer_sheet_id/, 'report-events subscribe must not send undocumented answer_sheet_id');
assertContains(reportEventsClient, /assessment_id:\s*String\(assessmentId\)/, 'report-events subscribe must include assessment_id per doc 12');
assertContains(reportEventsClient, /startFirstStatusTimer/, 'report-events first-status timeout must start after subscription');
assertContains(reportEventsClient, /REPORT_EVENTS_CAPABILITY/, 'report-events must keep runtime capability state');
assertContains(read('src/modules/assessment/pages/AssessmentReportPendingPage.tsx'), /waitAssessmentReportLifecycle/, 'pending page must use unified report lifecycle waiter');
assertNotContains(personalityReportPage, /getAssessmentByAnswersheetId/, 'personality report page must not call deprecated answersheets assessment endpoint');
assertContains(loadPersonalityReportService, /loadPersonalityReportByAssessmentId/, 'personality report loader must expose assessment-id entry');
assertContains(loadPersonalityReportService, /getPersonalityReportStatus/, 'assessment-id report loader must gate report read by report-status');
assertContains(loadPersonalityReportService, /loadPersonalityReportByAnswerSheet/, 'personality report loader must expose answersheet compat entry');
assertContains(loadPersonalityReportService, /waitTypologyAssessmentId/, 'answersheet compat must resolve assessment_id via readiness');
assertContains(personalityReportPage, /loadPersonalityReportByAssessmentId/, 'personality report page must load via report service');
assertNotContains(personalityReportPage, /waitTypologyAssessmentId/, 'personality report page must not embed typology list fallback');
assertContains(loadRecentAssessmentsService, /loadMedicalAssessmentRecords/, 'home recent assessments must load medical scale records');
assertNotContains(loadRecentAssessmentsService, /listPersonalityAssessments/, 'home recent assessments must not load personality assessments');
assertContains(loadRecentAssessmentsService, /isMedicalAssessmentKind\(item\.assessment_kind \|\| item\.kind\)/, 'home recent assessments must reject non-medical records');
assertContains(homeTabPage, /fetchRecentAssessments/, 'home tab must call recent assessments service via alias to avoid shadowing');
assertNotContains(homeTabPage, /await loadRecentAssessments\(testeeId/, 'home tab must not recursively call shadowed loadRecentAssessments');
assertNotContains(homeTabPage, /getAssessments/, 'home tab must not call deprecated GET /assessments list');
assertContains(loadMedicalRecordsService, /COLLECTION_API_CAPABILITIES\.medicalAssessmentsList/, 'medical record loader must gate GET /assessments behind capability flag');
assertContains(assessmentRecordsPage, /ASSESSMENT_KIND\.MEDICAL/, 'report tab page must default to medical assessments list');
assertNotContains(medicalReportPage, /getAssessmentByAnswersheetId/, 'medical report page must not call deprecated answersheets assessment endpoint');
assertContains(loadMedicalReportService, /loadMedicalReportByAssessmentId/, 'medical report loader must expose assessment-id entry');
assertContains(loadMedicalReportService, /ensureMedicalReportReadable/, 'medical report loader must gate scores behind report-status');
assertContains(loadMedicalReportService, /loadMedicalReportByAnswerSheet/, 'medical report loader must expose answersheet compat entry');
assertContains(loadMedicalReportService, /waitMedicalAssessmentId/, 'answersheet compat must resolve assessment_id via readiness');
assertContains(medicalReportPage, /loadMedicalReportByAssessmentId/, 'medical report page must load via report service');
assertNotContains(medicalReportPage, /waitMedicalAssessmentId/, 'medical report page must not embed medical list fallback');
assertContains(assessmentFillPage, /resolveAssessmentFillEntryParams/, 'fill page must resolve entry via assessmentFillEntry');
assertContains(assessmentFillPage, /buildPostSubmitRedirectUrl/, 'fill page must use shared submit navigation');
assertNotContains(assessmentFillPage, /createPersonalitySession/, 'fill page must not call personality session API directly');
assertContains(assessmentFillEntry, /resolveAssessmentEntry/, 'fill entry helper must resolve assessment entry tokens');
assertContains(assessmentSubmitNavigation, /ASSESSMENT_KIND\.PERSONALITY/, 'submit navigation must pass personality kind to pending page');
assertNotContains(medicalAssessmentApi, /\/answersheets\/\$\{String\(answersheetId\)\}\/assessment/, 'assessment API must not call deprecated answersheets assessment endpoint');
assertNotContains(analysisApi, /\/answersheets\/\$\{aid\}\/assessment/, 'analysis API must not call deprecated answersheets assessment endpoint');
assertContains(medicalAssessmentApi, /extractAssessmentList/, 'assessment API must extract list items for answer_sheet_id matching');
assertContains(medicalAssessmentApi, /\/assessments\/\$\{[^}]+\}\/report/, 'medical assessment API must fetch report via GET /assessments/{id}/report');
assertContains(medicalAssessmentApi, /getMedicalAssessmentReport|mapMedicalReportPayload/, 'medical assessment API must map the medical report response');
assertNotContains(analysisApi, /config\.collectionHost/, 'analysis API must delegate collection requests to assessmentApi');

const assessmentKind = read('src/shared/lib/assessmentKind.js');

assertContains(assessmentKind, /isTypologyCatalogModel/, 'assessmentKind must expose isTypologyCatalogModel');
assertContains(assessmentKind, /isTypologyAssessmentModel/, 'assessmentKind must expose isTypologyAssessmentModel');
assertContains(mappers, /product_channel|productChannel/, 'model mapper must read product_channel');

assertContains(
  waitForReportReady,
  /pollReportStatus/,
  'report wait flow must use report-status short polling'
);
assertContains(waitForReportReady, /tryWebSocket\s*=\s*true/, 'report wait must try WebSocket by default');
assertContains(waitForReportReady, /retryAfterMs/, 'report wait must honor retry-after backoff');
assertContains(
  read('src/modules/assessment/services/reportWaitStrategy.js'),
  /pollReportStatus/,
  'report wait strategy must expose pollReportStatus'
);

assertContains(answerSerializer, /USE_JSON_ANSWER_VALUE\s*=\s*true/, 'answer serializer must default to JSON answer values');
assertContains(answerSerializer, /JSON\.stringify\(\{ option:/, 'radio answers must serialize to {"option":...}');

assertContains(
  read('src/services/api/assessmentApi.js'),
  /getAssessmentReportStatus/,
  'medical assessment API must expose report-status'
);
assertContains(reportWaitStrategy, /interpreted/, 'report wait strategy must treat interpreted as completed for personality');
assertNotContains(reportReadiness, /completed/, 'current report readability must not treat completed as a success terminal state');
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
assertNotContains(submitFlow, /waitForSubmitCompletion|queued|submit-status/, 'submit flow must not retain queue semantics');

assertNotContains(personalityCatalogService, /PERSONALITY_CATALOG_ITEMS|personalityModels/, 'catalog service must not use hardcoded personality catalog');
assertContains(personalityCatalog, /selectPersonalityLandingItems/, 'catalog landing entries must resolve from published model data');
assertContains(personalityCatalog, /status[\s\S]*published/, 'catalog landing entries must only select published models');
assertContains(personalityCatalog, /MBTI_|SBTI_|BIG5_|ENNEAGRAM_/, 'catalog landing entries must classify documented model-code families');
assertNotContains(personalityCatalog, /MBTI_FC_93|MBTI_OEJTS|SBTI_FUN|BIG5_IPIP_50|ENNEAGRAM_45/, 'catalog landing entries must not pin a specific model version');
assertNotContains(mbtiVariants, /MBTI_FALLBACK_VARIANTS|startsWith\(['"]MBTI/, 'variant grouping must use backend family_code only');

if (!Array.isArray(modelsFixture.models) || modelsFixture.models.length < 5) {
  fail('personality-models-list fixture must include models array from collection-server');
}
if (!modelsFixture.models.some((item) => /^MBTI_/i.test(String(item.code || '')))) {
  fail('personality-models-list fixture must include MBTI model-code families');
}
if (!modelsFixture.models.every((item) => item.kind === 'typology')) {
  fail('personality-models-list fixture models must use kind=typology');
}

if (!sessionFixture.submit_contract?.questionnaire_version) {
  fail('personality-session fixture must include submit_contract.questionnaire_version');
}
if (sessionFixture.submit_contract?.kind) {
  fail('personality-session submit_contract must not include legacy kind field');
}
if (sessionFixture.model?.kind !== 'typology') {
  fail('personality-session fixture model.kind must be typology');
}

if (!reportFixture.model_extra?.type_code) {
  fail('personality-report fixture must include model_extra.type_code');
}
if (!Array.isArray(reportFixture.report_sections) || !reportFixture.report_sections.length) {
  fail('personality-report fixture must include report_sections');
}
if (reportFixture.model?.kind !== 'personality') {
  fail('personality-report fixture model.kind must be personality at evaluation layer');
}

if (submitAcceptedFixture.status !== 'accepted' || !submitAcceptedFixture.request_id || !submitAcceptedFixture.answersheet_id) {
	fail('personality-submit-accepted fixture must include accepted status, request_id and answersheet_id');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[collection-personality-contracts] ok');
