import { waitForAssessmentReadiness } from '@/services/api/answersheetApi';

/**
 * 通过 AnswerSheet readiness 等待异步 Assessment 创建。
 */
export async function waitTypologyAssessmentId(testeeId, answerSheetId, options = {}) {
	const readiness = await waitForAssessmentReadiness(answerSheetId, testeeId, options);
	return options.returnMatchedItem
		? { id: readiness?.assessment_id, answer_sheet_id: readiness?.answersheet_id }
		: String(readiness?.assessment_id || '');
}
