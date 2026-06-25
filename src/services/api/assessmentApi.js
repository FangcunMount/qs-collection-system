import { request } from '../servers';
import config from '../../config';

/**
 * Collection 测评 API
 * 负责测评（assessment）、因子、报告的查询
 */

const buildQueryString = (params = {}) => {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value
        .filter(item => item !== undefined && item !== null && item !== '')
        .forEach(item => {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      return;
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return pairs.join('&');
};

/**
 * 获取测评记录列表
 * @param {object} options
 * @param {string|number} options.testeeId
 * @param {string} [options.status]
 * @param {string} [options.scaleCode]
 * @param {string} [options.riskLevel]
 * @param {string} [options.dateFrom]
 * @param {string} [options.dateTo]
 * @param {number} [options.page]
 * @param {number} [options.pageSize]
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export const getAssessments = ({
  testeeId,
  status,
  scaleCode,
  riskLevel,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 20
} = {}) => {
  const params = {
    testee_id: testeeId ? String(testeeId) : '',
    status,
    scale_code: scaleCode,
    risk_level: riskLevel,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    page_size: pageSize
  };

  const queryString = buildQueryString(params);
  const urlWithParams = queryString ? `/assessments?${queryString}` : '/assessments';

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
 * 通过答卷ID获取测评详情
 * @param {string|number} answersheetId - 答卷ID
 * @returns {Promise<object>}
 */
export const getAssessmentByAnswersheetId = (answersheetId, options = {}) => {
  return request(`/answersheets/${String(answersheetId)}/assessment`, {}, {
    host: config.collectionHost,
    needToken: true,
    ...options
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
 * 获取测评趋势摘要
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<object>}
 */
export const getAssessmentTrendSummary = (id, testeeId) => {
  return request(`/assessments/${String(id)}/trend-summary`, {}, {
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
 * @param {string|number} id - 测评ID
 * @param {string|number} testeeId - 受试者ID
 * @param {number} timeout - 服务端挂起秒数，范围 1-25，默认 20
 * @returns {Promise<AssessmentStatusResponse>}
 */
export const waitAssessmentReport = (id, testeeId, timeout = 20) => {
  const validTimeout = Math.max(1, Math.min(25, timeout));

  return request(`/assessments/${String(id)}/wait-report`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: {
      testee_id: String(testeeId),
      timeout: validTimeout
    }
  });
};

/** wait-report 终态：成功 */
export const isReportWaitCompleted = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'completed' || normalized === 'interpreted';
};

/** wait-report 终态：失败 */
export const isReportWaitFailed = (status) => {
  return String(status || '').toLowerCase() === 'failed';
};

/** 通过答卷查测评：尚未创建时返回 pending，而非 404 */
export const isAssessmentPending = (detail) => {
  if (!detail || typeof detail !== 'object') {
    return false;
  }
  return !detail.id && String(detail.status || '').toLowerCase() === 'pending';
};

export default {
  getAssessments,
  getAssessmentByAnswersheetId,
  getAssessmentDetail,
  getAssessmentScores,
  getAssessmentReport,
  getAssessmentTrendSummary,
  getHighRiskFactors,
  getFactorTrend,
  waitAssessmentReport,
  isReportWaitCompleted,
  isReportWaitFailed,
  isAssessmentPending
};
