import { submitAnswersheet } from '@/services/api/answersheetApi';
import { normalizeSubmitDone } from '@/services/api/personality';

/**
 * 提交答卷。HTTP 202 必须直接包含可靠持久化后的 answersheet_id。
 */
export async function submitAssessmentAndResolveAnswersheet(payload, options = {}) {
  const submitResult = await submitAnswersheet(payload, options);
  const normalized = normalizeSubmitDone(submitResult);

  if (!normalized.answersheetId || String(normalized.status).toLowerCase() !== 'accepted') {
    throw new Error('提交失败：可靠受理响应缺少 answersheet_id');
  }
  return {
    ...submitResult,
    id: normalized.answersheetId,
    answersheet_id: normalized.answersheetId,
    request_id: normalized.requestId || submitResult?.request_id || options.requestId,
    submit_mode: 'accepted',
  };
}
