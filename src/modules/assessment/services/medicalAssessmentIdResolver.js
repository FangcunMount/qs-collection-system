import { getAssessments, extractAssessmentList, normalizeAssessmentListItem } from '@/services/api/assessments';
import { COLLECTION_API_CAPABILITIES } from '@/shared/config/collectionApiCapabilities';
import { pollAssessmentIdByAnswerSheet } from './pollAssessmentIdByAnswerSheet';

async function fetchMedicalAssessmentItemsFromList(testeeId) {
  const result = await getAssessments({
    testeeId,
    page: 1,
    pageSize: 20,
  });
  return extractAssessmentList(result).map(normalizeAssessmentListItem);
}

/**
 * 医学测评 assessment_id HTTP 降级：仅在 GET /assessments 列表可用时使用。
 */
export function createMedicalAssessmentFetchItems(answerSheetId, testeeId) {
  if (!COLLECTION_API_CAPABILITIES.medicalAssessmentsList) {
    return async () => [];
  }

  return (normalizedTesteeId) => fetchMedicalAssessmentItemsFromList(normalizedTesteeId);
}

export async function resolveMedicalAssessmentIdViaList(testeeId, answerSheetId, options = {}) {
  return pollAssessmentIdByAnswerSheet({
    testeeId,
    answerSheetId,
    ...options,
    fetchItems: (normalizedTesteeId) => fetchMedicalAssessmentItemsFromList(normalizedTesteeId),
  });
}
