import { request } from '../servers';
import config from '../../config';

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
 * 创建人格测评会话（锁定题版 + 提交契约）
 * @param {{ modelCode: string, testeeId: string|number }} params
 */
export const createPersonalityAssessmentSession = ({ modelCode, testeeId }) => {
  return request('/personality-assessment-sessions', {
    model_code: modelCode,
    testee_id: testeeId
  }, {
    host: config.collectionHost,
    method: 'POST',
    needToken: true
  });
};

/**
 * 获取人格模型列表（可匿名，但小程序侧建议带登录态）
 */
export const getPersonalityModels = ({
  page = 1,
  pageSize = 20,
  category,
  keyword
} = {}) => {
  const params = {
    page,
    page_size: pageSize,
    category,
    keyword
  };
  const queryString = buildQueryString(params);
  const url = queryString ? `/personality-models?${queryString}` : '/personality-models';

  return request(url, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: false
  });
};

/**
 * 获取人格模型分类
 */
export const getPersonalityModelCategories = () => {
  return request('/personality-models/categories', {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: false
  });
};

/**
 * 获取人格测评记录列表
 */
export const getPersonalityAssessments = ({
  testeeId,
  modelCode,
  status,
  page = 1,
  pageSize = 20
} = {}) => {
  const params = {
    testee_id: testeeId ? String(testeeId) : '',
    model_code: modelCode,
    status,
    page,
    page_size: pageSize
  };
  const queryString = buildQueryString(params);
  const url = queryString ? `/personality-assessments?${queryString}` : '/personality-assessments';

  return request(url, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true
  });
};

/**
 * 获取人格测评详情
 */
export const getPersonalityAssessmentDetail = (id, testeeId) => {
  return request(`/personality-assessments/${String(id)}`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
    needToken: true
  });
};

/**
 * 长轮询等待人格测评报告
 */
export const waitPersonalityAssessmentReport = (id, testeeId, timeout = 20) => {
  const validTimeout = Math.max(1, Math.min(25, timeout));

  return request(`/personality-assessments/${String(id)}/wait-report`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: {
      testee_id: String(testeeId),
      timeout: validTimeout
    }
  });
};

/**
 * 获取人格测评报告
 */
export const getPersonalityAssessmentReport = (id, testeeId) => {
  return request(`/personality-assessments/${String(id)}/report`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
    needToken: true
  });
};

export default {
  createPersonalityAssessmentSession,
  getPersonalityModels,
  getPersonalityModelCategories,
  getPersonalityAssessments,
  getPersonalityAssessmentDetail,
  waitPersonalityAssessmentReport,
  getPersonalityAssessmentReport
};
