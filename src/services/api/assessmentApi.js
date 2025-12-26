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
  const params = { testee_id: String(testeeId), page, page_size: pageSize };
  if (status) params.status = status;
  
  // 对于 GET 请求，需要将参数放在 URL 中
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const urlWithParams = `/assessments?${queryString}`;
  
  return request(urlWithParams, {}, {
    host: config.collectionHost,
    method: 'GET',
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
  return request(`/assessments/${String(id)}`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
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
  return request(`/assessments/${String(id)}/scores`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
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
  return request(`/assessments/${String(id)}/report`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
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
  return request(`/assessments/${String(id)}/factors/high-risk`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
    needToken: true
  });
};

/**
 * 获取因子得分趋势
 * 使用 collection.yaml 中的合法接口: GET /assessments/trend
 * @param {string|number} testeeId - 受试者ID
 * @param {string} factorCode - 因子编码
 * @param {number} limit - 数据点数量
 * @returns {Promise<Array>}
 */
export const getFactorTrend = (testeeId, factorCode, limit = 10) => {
  return request('/assessments/trend', {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId), factor_code: factorCode, limit },
    needToken: true
  });
};

/**
 * 长轮询等待报告生成
 * 等待测评报告生成，支持长轮询机制。如果报告已生成则立即返回，否则等待最多 timeout 秒
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @param {number} timeout - 超时时间（秒），范围 5-60，默认 15
 * @returns {Promise<{status: string, risk_level?: string, total_score?: number, updated_at?: number}>}
 */
export const waitAssessmentReport = (id, testeeId, timeout = 15) => {
  // 确保 timeout 在有效范围内
  const validTimeout = Math.max(5, Math.min(60, timeout));
  
  // 对于 GET 请求，查询参数应该放在 data 中，Taro 会自动将其添加到 URL
  return request(`/assessments/${String(id)}/wait-report`, {
    testee_id: String(testeeId),
    timeout: validTimeout
  }, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true
  });
};

export default {
  getAssessments,
  getAssessmentDetail,
  getAssessmentScores,
  getAssessmentReport,
  getHighRiskFactors,
  getFactorTrend,
  waitAssessmentReport
};
