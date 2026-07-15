import {
  extractBehaviorAssessmentList,
  listBehaviorAssessments,
  normalizeBehaviorAssessmentListItem,
} from '@/services/api/behavior';
import { pollAssessmentIdByAnswerSheet } from './pollAssessmentIdByAnswerSheet';

/**
 * 历史行为能力报告链接缺少 assessment_id 时，通过专用列表恢复。
 */
export async function waitBehaviorAssessmentId(testeeId, answerSheetId, options = {}) {
  return pollAssessmentIdByAnswerSheet({
    testeeId,
    answerSheetId,
    ...options,
    fetchItems: async (normalizedTesteeId) => {
      const result = await listBehaviorAssessments({
        testeeId: normalizedTesteeId,
        page: 1,
        pageSize: 20,
      });
      return extractBehaviorAssessmentList(result).map(normalizeBehaviorAssessmentListItem);
    },
  });
}
