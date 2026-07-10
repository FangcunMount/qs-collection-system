import {
  listPersonalityAssessments,
  extractPersonalityAssessmentList,
  normalizePersonalityAssessmentRecord,
} from '@/services/api/personality';
import { pollAssessmentIdByAnswerSheet } from './pollAssessmentIdByAnswerSheet';

/**
 * 轮询 typology-assessments 列表，按 answer_sheet_id 匹配 assessment_id
 */
export async function waitTypologyAssessmentId(testeeId, answerSheetId, options = {}) {
  return pollAssessmentIdByAnswerSheet({
    testeeId,
    answerSheetId,
    ...options,
    fetchItems: async (normalizedTesteeId) => {
      const payload = await listPersonalityAssessments({
        testeeId: normalizedTesteeId,
        page: 1,
        pageSize: 20,
      });
      return extractPersonalityAssessmentList(payload).map(normalizePersonalityAssessmentRecord);
    },
  });
}
