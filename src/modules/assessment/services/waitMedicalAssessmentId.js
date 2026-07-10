import { getAssessments, extractAssessmentList, normalizeAssessmentListItem } from '@/services/api/assessments';
import { COLLECTION_API_CAPABILITIES, isAssessmentsListUnavailableError } from '@/shared/config/collectionApiCapabilities';
import { pollAssessmentIdByAnswerSheet } from './pollAssessmentIdByAnswerSheet';

const MEDICAL_LIST_UNAVAILABLE_MESSAGE =
  '暂无法关联医学测评记录：请确认 submit-status 已返回 assessment_id，或等待测评列表接口上线后重试';

/**
 * 轮询医学测评 assessment_id（仅当 GET /assessments 列表已上线时使用）。
 * 常规路径：提交结果携带 assessment_id；报告等待走 WSS /report-events → report-status（文档 12）。
 */
export async function waitMedicalAssessmentId(testeeId, answerSheetId, options = {}) {
  if (!COLLECTION_API_CAPABILITIES.medicalAssessmentsList) {
    throw new Error(MEDICAL_LIST_UNAVAILABLE_MESSAGE);
  }

  try {
    return await pollAssessmentIdByAnswerSheet({
      testeeId,
      answerSheetId,
      ...options,
      fetchItems: async (normalizedTesteeId) => {
        const result = await getAssessments({
          testeeId: normalizedTesteeId,
          page: 1,
          pageSize: 20,
        });
        return extractAssessmentList(result).map(normalizeAssessmentListItem);
      },
    });
  } catch (error) {
    if (isAssessmentsListUnavailableError(error)) {
      throw new Error(MEDICAL_LIST_UNAVAILABLE_MESSAGE);
    }
    throw error;
  }
}
