import { getAnswersheet } from './answersheetApi';
import { waitMedicalAssessmentId } from '@/modules/assessment/services/waitMedicalAssessmentId';
import { getMedicalAssessmentReport } from './assessmentApi';

/**
 * 获取医学测评报告（解读）
 * @param {number} assessmentId - 测评ID
 * @param {string|number} testeeId - 受试者ID
 */
export const getAssessmentReport = (assessmentId, testeeId) => {
  return getMedicalAssessmentReport(assessmentId, testeeId);
};

/**
 * @deprecated 请使用 waitMedicalAssessmentId + getMedicalAssessmentReport；保留兼容旧 import。
 * 通过答卷ID获取医学测评报告
 */
export const getAssessmentReportByAnswersheetId = async (answersheetId, testeeId) => {
  const aid = String(answersheetId);
  let resolvedTesteeId = testeeId ? String(testeeId) : '';

  if (!resolvedTesteeId) {
    const sheet = await getAnswersheet(aid, { showLoading: false });
    resolvedTesteeId = sheet?.testee_id ? String(sheet.testee_id) : '';
  }

  if (!resolvedTesteeId) {
    throw new Error('[analysisApi] 通过答卷ID获取测评详情失败，缺少 testeeId');
  }

	const assessmentId = await waitMedicalAssessmentId(resolvedTesteeId, aid, { maxAttempts: 1 });

  return getMedicalAssessmentReport(assessmentId, resolvedTesteeId);
};

export default {
  getAssessmentReport,
  getAssessmentReportByAnswersheetId,
};
