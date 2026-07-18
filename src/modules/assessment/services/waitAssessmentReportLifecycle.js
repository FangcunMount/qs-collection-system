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
		});
		if (readiness) {
			assessmentId = String(readiness.assessment_id);
			resolvedAnswerSheetId = String(readiness.answersheet_id || resolvedAnswerSheetId);
			onSubmissionReady?.({ requestId: String(requestId || ''), answersheetId: resolvedAnswerSheetId, assessmentId });
		}
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
