import { getAssessmentResponse } from '@/services/api/assessmentResponses';
import { getSelectedTesteeId } from '@/shared/stores/testees';

/**
 * 解析受试者 ID：URL 参数 > store > 答卷详情
 */
export async function resolveTesteeIdForAnswerSheet({
  testeeIdFromUrl,
  answersheetId,
  logger,
} = {}) {
  if (testeeIdFromUrl) {
    logger?.RUN?.('使用 URL 参数中的 testeeId', { testeeId: testeeIdFromUrl });
    return String(testeeIdFromUrl);
  }

  const selectedTesteeId = getSelectedTesteeId();
  if (selectedTesteeId) {
    logger?.RUN?.('从 store 获取 testeeId', { testeeId: selectedTesteeId });
    return String(selectedTesteeId);
  }

  if (!answersheetId) {
    return '';
  }

  try {
    logger?.RUN?.('通过 answersheetId 获取 testeeId', { answersheetId });
    const answersheet = await getAssessmentResponse(answersheetId);
    if (answersheet?.testee_id) {
      logger?.RUN?.('通过答卷详情获取到 testeeId', { testeeId: answersheet.testee_id });
      return String(answersheet.testee_id);
    }
  } catch (error) {
    logger?.ERROR?.('通过 answersheetId 获取 testeeId 失败', error);
  }

  return '';
};
