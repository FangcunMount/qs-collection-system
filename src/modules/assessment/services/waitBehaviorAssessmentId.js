import { waitForAssessmentReadiness } from '@/services/api/answersheetApi';

/**
 * 通过 AnswerSheet readiness 等待行为能力 Assessment 创建。
 */
export async function waitBehaviorAssessmentId(testeeId, answerSheetId, options = {}) {
	const readiness = await waitForAssessmentReadiness(answerSheetId, testeeId, options);
	return String(readiness?.assessment_id || '');
}
