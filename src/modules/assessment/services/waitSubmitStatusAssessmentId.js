import { waitForSubmitAssessmentId } from '@/services/api/answersheetApi';

/**
 * 轮询 submit-status，在 status=done 且测评落库后取得 assessment_id（人格/医学通用，文档 12/13）。
 */
export async function waitSubmitStatusAssessmentId(requestId, options = {}) {
  if (!requestId) {
    return '';
  }

  return waitForSubmitAssessmentId(String(requestId), options);
}
