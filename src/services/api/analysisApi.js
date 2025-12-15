import { request } from '../servers'
import config from '../../config';

/**
 * 获取测评报告（解读）
 * @param {number} assessmentId - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<object>}
 * 
 * @deprecated 旧接口 /readAnswerSheet/interpretationReport 已下线
 * 现在应该使用此函数替代，需要传入 assessmentId 和 testeeId
 */
export const getAssessmentReport = (assessmentId, testeeId) => {
  return request(`/assessments/${String(assessmentId)}/report`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
    needToken: true,
    isNeedLoading: true
  });
}

/**
 * 通过答卷ID获取测评报告（便捷方式）
 * 流程：
 * 1) GET /answersheets/{id}/assessment 获取测评详情，提取 assessment.id 与 testee_id
 * 2) GET /assessments/{id}/report?testee_id=... 获取报告
 * @param {string|number} answersheetId - 答卷ID
 * @returns {Promise<object>} AssessmentReportResponse
 */
export const getAssessmentReportByAnswersheetId = async (answersheetId) => {
  const aid = String(answersheetId);
  const detail = await request(`/answersheets/${aid}/assessment`, {}, {
    host: config.collectionHost,
    needToken: true,
    isNeedLoading: true
  });

  const assessmentId = detail && detail.id ? String(detail.id) : '';
  const testeeId = detail && detail.testee_id ? String(detail.testee_id) : '';

  if (!assessmentId || !testeeId) {
    throw new Error('[analysisApi] 通过答卷ID获取测评详情失败，缺少 assessmentId 或 testeeId');
  }

  return getAssessmentReport(assessmentId, testeeId);
}

/**
 * 获取测评分析（包括因子解读、T分等）
 * 这是对原 getAnalysis 的兼容包装，现在改用 getAssessmentReport
 * @param {number} answersheetId - 答卷ID（注意：需要对应的测评ID和受试者ID）
 * @returns {Promise<object>}
 * 
 * ⚠️ 此函数已弃用，建议直接使用 getAssessmentReport(assessmentId, testeeId)
 */
export const getAnalysis = (answersheetId) => {
  // 旧接口已下线，此处保留以兼容，但应该改为使用 getAssessmentReport
  console.warn(
    '[analysisApi] getAnalysis 已弃用，请改用 getAssessmentReport(assessmentId, testeeId)',
    { answersheetId }
  );
  
  // 如果需要从答卷ID获取测评数据，需要：
  // 1. 先调用 getAnswersheet(answersheetId) 获取答卷信息
  // 2. 从答卷信息中获取 assessment_id 和 testee_id
  // 3. 再调用 getAssessmentReport(assessment_id, testee_id)
  
  return Promise.reject({
    code: 'DEPRECATED',
    message: 'getAnalysis API 已弃用，请改用 getAssessmentReport(assessmentId, testeeId)'
  });
}

export default {
  getAssessmentReport,
  getAssessmentReportByAnswersheetId,
  getAnalysis
}