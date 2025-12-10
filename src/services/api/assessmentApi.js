import { request } from '../servers';
import config from '../../config';

/**
 * Collection 测评 API
 * 负责测评（assessment）、因子、报告的查询
 */

/**
 * 获取测评列表
 * @param {string|number} testeeId - 受试者ID
 * @param {string} status - 状态筛选（可选）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export const getAssessments = (testeeId, status, page = 1, pageSize = 20) => {
  const params = { testee_id: testeeId, page, page_size: pageSize };
  if (status) params.status = status;
  
  return request('/assessments', {}, {
    host: config.collectionHost,
    params,
    needToken: true
  });
};

/**
 * 获取测评详情
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<object>}
 */
export const getAssessmentDetail = (id, testeeId) => {
  return request(`/assessments/${id}`, {}, {
    host: config.collectionHost,
    params: { testee_id: testeeId },
    needToken: true
  });
};

/**
 * 获取测评得分详情
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<Array>}
 */
export const getAssessmentScores = (id, testeeId) => {
  return request(`/assessments/${id}/scores`, {}, {
    host: config.collectionHost,
    params: { testee_id: testeeId },
    needToken: true
  });
};

/**
 * 获取测评报告
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<object>}
 */
export const getAssessmentReport = (id, testeeId) => {
  return request(`/assessments/${id}/report`, {}, {
    host: config.collectionHost,
    params: { testee_id: testeeId },
    needToken: true
  });
};

/**
 * 获取高风险因子
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<Array>}
 */
export const getHighRiskFactors = (id, testeeId) => {
  return request(`/assessments/${id}/factors/high-risk`, {}, {
    host: config.collectionHost,
    params: { testee_id: testeeId },
    needToken: true
  });
};

/**
 * 获取因子得分趋势
 * @param {string|number} testeeId - 受试者ID
 * @param {string} factorCode - 因子编码
 * @param {number} limit - 数据点数量
 * @returns {Promise<Array>}
 */
export const getFactorTrend = (testeeId, factorCode, limit = 10) => {
  return request('/assessments/trend', {}, {
    host: config.collectionHost,
    params: { testee_id: testeeId, factor_code: factorCode, limit },
    needToken: true
  });
};

export default {
  getAssessments,
  getAssessmentDetail,
  getAssessmentScores,
  getAssessmentReport,
  getHighRiskFactors,
  getFactorTrend
};
