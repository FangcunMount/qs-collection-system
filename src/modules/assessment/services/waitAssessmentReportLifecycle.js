import { waitForReportReady } from '@/modules/assessment/services/waitForReportReady';
import { waitForAssessmentReadiness } from '@/services/api/answersheetApi';

/**
 * 等待测评创建 + 报告终态（对齐文档 12/13）。
 *
 * 阶段①：无 assessment_id 时先解析
 *   - 按 answersheet_id + testee_id 轮询 assessment-readiness
 *
 * 阶段②：WSS /report-events → report-status 短轮询
 */
export async function waitAssessmentReportLifecycle({
  strategy,
  assessmentKind,
  assessmentId: assessmentIdFromUrl,
  answerSheetId,
  requestId,
  testeeId,
  onStatus,
  shouldContinue,
  logger,
  onSubmissionReady,
  assessmentLookupOptions = {},
  tryWebSocket = true,
  onFallback,
}) {
  let assessmentId = assessmentIdFromUrl ? String(assessmentIdFromUrl) : '';
  let resolvedAnswerSheetId = answerSheetId ? String(answerSheetId) : '';

  if (!assessmentId) {
    if (!resolvedAnswerSheetId || !testeeId) {
      throw new Error('缺少答卷或受试者编号，无法查询测评状态');
    }
    logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段①：轮询 assessment-readiness', {
      answerSheetId: resolvedAnswerSheetId,
      testeeId,
    });
    const readiness = await waitForAssessmentReadiness(resolvedAnswerSheetId, testeeId, {
      ...assessmentLookupOptions,
      shouldContinue,
      onAttempt: (attempt, result, elapsedMs) => {
        assessmentLookupOptions.onAttempt?.(attempt, result, elapsedMs);
        onStatus?.({
          status: 'processing',
          stage: 'assessment_pending',
          message: elapsedMs >= 60000 ? '答卷已接收，测评生成延迟' : '正在生成测评记录，请稍候...',
        });
      },
      onDelayed: (elapsedMs, detail) => {
        assessmentLookupOptions.onDelayed?.(elapsedMs, detail);
        onStatus?.({
          status: 'processing',
          stage: 'assessment_delayed',
          message: '答卷已接收，测评生成延迟',
        });
      },
    });
    if (!readiness) {
      return {
        cancelled: true,
        source: 'assessment-readiness',
        statusData: {},
        answerSheetId: resolvedAnswerSheetId,
      };
    }

    const readinessStatus = String(readiness.status || '').toLowerCase();
    resolvedAnswerSheetId = readiness.answersheet_id
      ? String(readiness.answersheet_id)
      : resolvedAnswerSheetId;
    if (readinessStatus === 'no_assessment_required') {
      return {
        source: 'assessment-readiness',
        statusData: {
          ...readiness,
          status: 'no_assessment_required',
          stage: 'no_assessment_required',
          message: readiness.message || '答卷已提交，无需生成测评报告',
        },
        answerSheetId: resolvedAnswerSheetId,
        requestId: requestId ? String(requestId) : '',
      };
    }
    if (readinessStatus === 'failed') {
      const failedResult = {
        source: 'assessment-readiness',
        failed: true,
        statusData: {
          ...readiness,
          status: 'failed',
          stage: 'assessment_failed',
          message: readiness.message || readiness.reason || '测评记录生成失败，请稍后重试',
        },
        answerSheetId: resolvedAnswerSheetId,
        requestId: requestId ? String(requestId) : '',
      };
      if (readiness.assessment_id) {
        failedResult.assessmentId = String(readiness.assessment_id);
      }
      return failedResult;
    }

    assessmentId = readiness.assessment_id ? String(readiness.assessment_id) : '';
    onSubmissionReady?.({
      requestId: String(requestId || ''),
      answersheetId: resolvedAnswerSheetId,
      assessmentId,
    });
  }

  if (!assessmentId) {
    throw new Error('未获取到测评编号，请重新提交或稍后重试');
  }

  logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段②：等待报告就绪', {
    assessmentId,
    testeeId,
    tryWebSocket,
    assessmentKind,
  });

  const reportResult = await waitForReportReady({
    strategy,
    assessmentId,
    testeeId,
    onStatus,
    shouldContinue,
    logger,
    tryWebSocket,
    onFallback,
  });

  return {
    ...reportResult,
    assessmentId,
    answerSheetId: resolvedAnswerSheetId,
    requestId: requestId ? String(requestId) : '',
  };
}
