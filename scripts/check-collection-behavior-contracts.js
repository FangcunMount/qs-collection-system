/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function fail(message) {
  console.error(`[collection-behavior-contracts] ${message}`);
  process.exitCode = 1;
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) fail(message);
}

function assertNotContains(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

const yaml = read('docs/collection.yaml');
const reportWaitGuide = read('docs/12-小程序报告等待接入指南.md');
const behaviorAssessmentApi = read('src/services/api/behavior/assessmentApi.js');
const behaviorReportApi = read('src/services/api/behavior/reportApi.js');
const behaviorRecordService = read('src/modules/assessment/services/behaviorAssessmentRecordService.js');
const behaviorIdResolver = read('src/modules/assessment/services/waitBehaviorAssessmentId.js');
const behaviorReportLoader = read('src/modules/assessment/services/loadBehaviorReport.js');
const recordController = read('src/modules/assessment/components/records/AssessmentRecordListController.tsx');
const reportWaitStrategy = read('src/modules/assessment/services/reportWaitStrategy.js');
const reportWaiter = read('src/modules/assessment/services/waitForReportReady.js');
const lifecycle = read('src/modules/assessment/services/waitAssessmentReportLifecycle.js');
const reportPendingPage = read('src/modules/assessment/pages/AssessmentReportPendingPage.tsx');
const reportPage = read('src/modules/assessment/pages/AssessmentReportPage.tsx');
const behaviorReportViewModel = read('src/modules/assessment/viewModels/behaviorReport.ts');
const behaviorReportPresentation = read('src/modules/assessment/viewModels/behaviorReportPresentation.ts');
const behaviorReportContent = read('src/modules/assessment/components/report/BehaviorReportContent.tsx');
const behaviorSources = [
  behaviorAssessmentApi,
  behaviorReportApi,
  behaviorRecordService,
  behaviorIdResolver,
  behaviorReportLoader,
].join('\n');

[
  '/api/v1/behavior-assessments:',
  '/api/v1/behavior-assessments/{id}:',
  '/api/v1/behavior-assessments/{id}/report:',
  '/api/v1/behavior-assessments/{id}/report-status:',
  '/api/v1/behavior-assessments/{id}/wait-report:',
].forEach((apiPath) => {
  assertContains(yaml, new RegExp(apiPath.replace(/[{}]/g, '\\$&')), `collection.yaml must define ${apiPath}`);
});

assertContains(behaviorAssessmentApi, /\/behavior-assessments/, 'behavior list/detail API must use /behavior-assessments');
assertContains(behaviorReportApi, /\/behavior-assessments\/\$\{[^}]+\}\/report-status/, 'behavior report status must use dedicated endpoint');
assertContains(behaviorReportApi, /\/behavior-assessments\/\$\{[^}]+\}\/wait-report/, 'behavior long polling must use dedicated endpoint');
assertContains(behaviorReportApi, /\/behavior-assessments\/\$\{[^}]+\}\/report/, 'behavior report must use dedicated endpoint');
assertNotContains(behaviorSources, /[`'"]\/assessments(?:[/?`'"])/, 'behavior services must not call medical /assessments');
assertContains(recordController, /loadBehaviorAssessmentRecords/, 'ability records must use behavior assessment record service');
assertContains(behaviorRecordService, /status:\s*statusFilter/, 'ability records must preserve the documented pending/done status filter');
assertContains(behaviorIdResolver, /waitForAssessmentReadiness/, 'ability links must resolve assessment_id from answersheet readiness');
assertContains(behaviorReportLoader, /getBehaviorReportStatus/, 'behavior report loader must gate reads by dedicated report-status');
assertContains(behaviorReportLoader, /getBehaviorReport/, 'behavior report loader must fetch the dedicated report');
assertContains(reportWaitStrategy, /eventKind:\s*['"]behavior['"]/, 'ability websocket subscription must use kind=behavior');
assertContains(reportWaitStrategy, /getBehaviorReportStatus/, 'ability report polling must use behavior report-status');
assertContains(reportWaiter, /strategy\.eventKind\s*\|\|\s*strategy\.kind/, 'report waiter must support API-specific websocket kinds');
assertContains(lifecycle, /waitForAssessmentReadiness/, 'ability lifecycle must use answersheet readiness');
assertContains(reportPendingPage, /kind:\s*resolveReportRedirectKind\(strategy\.kind\)/, 'ability pending success redirect must preserve kind=ability');
assertContains(reportPage, /loadBehaviorReportByAssessmentId/, 'ability report page must use behavior report loader');
assertContains(reportPage, /buildBehaviorReportViewModel/, 'ability report page must use the dedicated behavior report view model');
assertContains(reportPage, /BehaviorReportContent/, 'ability report page must render the dedicated behavior report content');
assertContains(reportPage, /isAbilityReport\s*\|\|\s*!assessmentId/, 'ability report page must not request medical trends');
assertContains(behaviorReportViewModel, /derived_scores/, 'behavior report view model must preserve derived scores');
assertContains(behaviorReportViewModel, /norm_reference/, 'behavior report view model must preserve norm references');
assertContains(behaviorReportPresentation, /gxkk9w/, 'behavior report presentation must recognize BRIEF-2');
assertContains(behaviorReportPresentation, /bjfki3/, 'behavior report presentation must recognize sensory SPM');
assertContains(behaviorReportContent, /BehaviorNormComparisonChart/, 'behavior report must render the norm comparison chart');
assertContains(behaviorReportContent, /完整能力画像/, 'behavior report must render the expanded ability portrait');
assertContains(behaviorReportContent, /整体支持建议/, 'behavior report must render real report suggestions when available');
assertNotContains(behaviorReportContent, /scrollX/, 'behavior portrait must not hide dimensions behind horizontal scrolling');
assertContains(reportWaitGuide, /kind=behavior/, 'report wait guide must document the behavior websocket kind');
assertContains(reportWaitGuide, /\/behavior-assessments\/\{id\}\/report-status/, 'report wait guide must document behavior report-status');

if (!process.exitCode) console.log('[collection-behavior-contracts] ok');
