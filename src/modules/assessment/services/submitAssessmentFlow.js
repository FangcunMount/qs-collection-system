import { submitAnswersheet, waitForSubmitCompletion } from '@/services/api/answersheetApi';
import { normalizeSubmitDone } from '@/services/api/personality';

/**
 * 统一提交答卷并解析 answersheet_id
 */
export async function submitAssessmentAndResolveAnswersheet(payload, options = {}) {
  const submitResult = await submitAnswersheet(payload, options);
  const normalized = normalizeSubmitDone(submitResult);

  if (normalized.answersheetId) {
    return {
      ...submitResult,
      id: normalized.answersheetId,
      answersheet_id: normalized.answersheetId,
      assessment_id: normalized.assessmentId || submitResult?.assessment_id,
      request_id: normalized.requestId || submitResult?.request_id || options.idempotencyKey,
      submit_mode: 'immediate',
      queued: false,
    };
  }

  if (normalized.requestId || submitResult?.request_id) {
    const requestId = normalized.requestId || submitResult.request_id;
    const statusResult = await waitForSubmitCompletion(requestId, {
      onProgress: options.onProgress,
      onSuccess: options.onSuccess,
    });
    const done = normalizeSubmitDone(statusResult);

    if (!done.answersheetId) {
      throw new Error('提交失败：未获取到答卷编号');
    }

    return {
      ...submitResult,
      ...statusResult,
      id: done.answersheetId,
      answersheet_id: done.answersheetId,
      assessment_id: done.assessmentId || statusResult?.assessment_id,
      request_id: requestId,
      submit_mode: 'queued',
      queued: true,
    };
  }

  throw new Error('提交失败：缺少 request_id 或 answersheet_id');
}
