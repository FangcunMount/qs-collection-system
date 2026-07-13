import { isPersonalityAssessmentKind } from '@/shared/lib/assessmentKind';
import { waitForReportReady } from '@/modules/assessment/services/waitForReportReady';
import { waitTypologyAssessmentId } from '@/modules/assessment/services/waitTypologyAssessmentId';
import { waitMedicalAssessmentId } from '@/modules/assessment/services/waitMedicalAssessmentId';
import { waitSubmitStatusCompletion } from '@/modules/assessment/services/waitSubmitStatusAssessmentId';

async function resolveAssessmentIdFallback(assessmentKind, testeeId, answerSheetId, options = {}) {
  if (isPersonalityAssessmentKind(assessmentKind)) {
    return waitTypologyAssessmentId(testeeId, answerSheetId, options);
  }
  return waitMedicalAssessmentId(testeeId, answerSheetId, options);
}

/**
 * 等待测评创建 + 报告终态（对齐文档 12/13）。
 *
 * 阶段①：无 assessment_id 时先解析
 *   - 新提交：轮询 GET /answersheets/submit-status，必须一次取得两个业务 ID
 *   - 历史链接：仅在没有 request_id 时允许按 answer_sheet_id 列表恢复
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
  allowLegacyListFallback = false,
}) {
  let assessmentId = assessmentIdFromUrl ? String(assessmentIdFromUrl) : '';
  let resolvedAnswerSheetId = answerSheetId ? String(answerSheetId) : '';

  if (!assessmentId && requestId) {
    logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段①：轮询 submit-status', {
      requestId,
      answerSheetId,
    });

    try {
      const submission = await waitSubmitStatusCompletion(requestId, {
        ...assessmentLookupOptions,
        shouldContinue,
        onAttempt: (attempt, statusResult) => {
          assessmentLookupOptions.onAttempt?.(attempt, statusResult);
          if (!statusResult?.assessment_id) {
            onStatus?.({
              status: 'processing',
              stage: 'queued',
              message: '正在关联测评记录，请稍候...',
            });
          }
        },
      });
      if (submission) {
        assessmentId = String(submission.assessment_id);
        resolvedAnswerSheetId = String(submission.answersheet_id);
        onSubmissionReady?.({
          requestId: String(submission.request_id || requestId),
          answersheetId: resolvedAnswerSheetId,
          assessmentId,
        });
      }
    } catch (error) {
      if (!allowLegacyListFallback) {
        throw error;
      }
      logger?.WARN?.('[waitAssessmentReportLifecycle] 历史链接 submit-status 不可用，尝试列表兜底', {
        requestId,
        message: error?.message,
      });
    }
  }

  if (!assessmentId && (allowLegacyListFallback || !requestId)) {
    logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段①：列表兜底解析 assessment_id', {
      answerSheetId: resolvedAnswerSheetId,
      testeeId,
      assessmentKind,
    });

    assessmentId = await resolveAssessmentIdFallback(
      assessmentKind,
      testeeId,
      resolvedAnswerSheetId,
      assessmentLookupOptions
    );
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
  });

  return {
    ...reportResult,
    assessmentId,
    answerSheetId: resolvedAnswerSheetId,
    requestId: requestId ? String(requestId) : '',
  };
}
