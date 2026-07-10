import config from '@/config';
import { isPersonalityAssessmentKind } from '@/shared/lib/assessmentKind';
import { waitForReportReady } from '@/modules/assessment/services/waitForReportReady';
import { waitTypologyAssessmentId } from '@/modules/assessment/services/waitTypologyAssessmentId';
import { waitMedicalAssessmentId } from '@/modules/assessment/services/waitMedicalAssessmentId';
import { waitSubmitStatusAssessmentId } from '@/modules/assessment/services/waitSubmitStatusAssessmentId';

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
 *   - 推荐：轮询 GET /answersheets/submit-status（status=done 且 assessment_id 出现）
 *   - 人格兜底：typology-assessments 列表按 answer_sheet_id 匹配
 *   - 医学兜底：GET /assessments 列表（若已上线）
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
  assessmentLookupOptions = {},
  tryWebSocket = config.reportEventsEnabled === true,
}) {
  let assessmentId = assessmentIdFromUrl ? String(assessmentIdFromUrl) : '';

  if (!assessmentId && requestId) {
    logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段①：轮询 submit-status', {
      requestId,
      answerSheetId,
    });

    try {
      assessmentId = await waitSubmitStatusAssessmentId(requestId, {
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
    } catch (error) {
      logger?.WARN?.('[waitAssessmentReportLifecycle] submit-status 未取得 assessment_id，尝试列表兜底', {
        requestId,
        message: error?.message,
      });
    }
  }

  if (!assessmentId) {
    logger?.RUN?.('[waitAssessmentReportLifecycle] 阶段①：列表兜底解析 assessment_id', {
      answerSheetId,
      testeeId,
      assessmentKind,
    });

    assessmentId = await resolveAssessmentIdFallback(
      assessmentKind,
      testeeId,
      answerSheetId,
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
  };
}
