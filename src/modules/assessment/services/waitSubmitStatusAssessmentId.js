import { waitForSubmitAssessmentId, waitForSubmitReady } from '@/services/api/answersheetApi';

/**
 * 兼容导出：严格轮询 submit-status，在 status=done 后取得 assessment_id。
 */
export async function waitSubmitStatusAssessmentId(requestId, options = {}) {
  if (!requestId) {
    return '';
  }

  return waitForSubmitAssessmentId(String(requestId), options);
}

export async function waitSubmitStatusCompletion(requestId, options = {}) {
  if (!requestId) {
    throw new Error('缺少 request_id，无法等待提交完成');
  }
  return waitForSubmitReady(String(requestId), options);
}
