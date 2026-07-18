import { request } from '../servers';
import config from '../../config';
import {
  COLLECTION_API_CAPABILITIES,
  createAssessmentsListUnavailableError,
} from '@/shared/config/collectionApiCapabilities';

/**
 * Collection 测评 API（collectionHost）
 * 契约真值：docs/collection.yaml
 * IAM / qsHost / apiserver 见各自 API 模块，不在此文件范围。
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
 * 查询医学量表测评列表（collection.yaml: GET /assessments）。
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
  if (!COLLECTION_API_CAPABILITIES.medicalAssessmentsList) {
    return Promise.reject(createAssessmentsListUnavailableError());
  }

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

export const extractAssessmentList = (payload = {}) => {
  const data = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.assessments)) return data.assessments;
  if (Array.isArray(data)) return data;
  return [];
};

export const normalizeAssessmentListItem = (raw = {}) => {
  const item = raw || {};
  return {
    id: item.id !== undefined && item.id !== null ? String(item.id) : '',
    answer_sheet_id: String(
      item.answer_sheet_id || item.answersheet_id || item.answerSheetId || ''
    ),
    testee_id: item.testee_id !== undefined && item.testee_id !== null
      ? String(item.testee_id)
      : '',
    status: item.status || '',
    raw: item,
  };
};

/**
 * 将 GET /assessments/{id}/report 响应归一为医学报告页 ViewModel 输入。
 * /scores 只承载得分事实，不能替代包含解读与建议的报告正文。
 */
export const mapMedicalReportPayload = (reportPayload = {}) => {
  const report = reportPayload?.data !== undefined ? reportPayload.data : reportPayload;
  const primaryScore = report?.primary_score || {};

  return {
    data: {
      ...report,
      scale_name: report?.scale_name || report?.model_name || report?.model?.title || '',
      scale_code: report?.scale_code || report?.model_code || report?.model?.code || '',
      total_score: primaryScore.value ?? report?.total_score ?? null,
      risk_level: report?.risk_level || report?.level?.code || '',
      dimensions: Array.isArray(report?.dimensions) ? report.dimensions : [],
      suggestions: Array.isArray(report?.suggestions) ? report.suggestions : [],
    },
  };
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
 * 获取医学测评报告正文（包含总分、因子解读和建议）。
 */
export const getMedicalAssessmentReport = async (id, testeeId) => {
  const result = await request(`/assessments/${String(id)}/report`, {}, {
    host: config.collectionHost,
    params: { testee_id: String(testeeId) },
    needToken: true,
  });
  return mapMedicalReportPayload(result);
};

/** @deprecated 请使用 getMedicalAssessmentReport */
export const getAssessmentReport = getMedicalAssessmentReport;

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
const normalizeReportStatusPayload = (raw = {}) => {
  const data = raw?.data !== undefined ? raw.data : raw;
  const payload = data && typeof data === 'object' ? data : {};
  return {
    status: String(payload.status || '').toLowerCase(),
    stage: String(payload.stage || payload.status || '').toLowerCase(),
    message: payload.message || '',
    reason: payload.reason || '',
    nextPollAfterMs: Number(payload.next_poll_after_ms) > 0 ? Number(payload.next_poll_after_ms) : 0,
    retryAfterMs: Number(payload.retry_after_ms) > 0 ? Number(payload.retry_after_ms) : 0,
    raw: payload,
  };
};

/**
 * 短轮询获取医学测评报告状态
 */
export const getAssessmentReportStatus = async (id, testeeId) => {
  const result = await request(`/assessments/${String(id)}/report-status`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: {
      testee_id: String(testeeId),
    },
  });

  return normalizeReportStatusPayload(result);
};

export const waitAssessmentReport = async (id, testeeId, timeout = 20) => {
  const validTimeout = Math.max(1, Math.min(25, timeout));

  const result = await request(`/assessments/${String(id)}/wait-report`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: {
      testee_id: String(testeeId),
      timeout: validTimeout
    }
  });

  return normalizeReportStatusPayload(result);
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

export default {
  getAssessments,
  extractAssessmentList,
  normalizeAssessmentListItem,
  mapMedicalReportPayload,
  getAssessmentScores,
  getMedicalAssessmentReport,
  getAssessmentReport,
  getAssessmentTrendSummary,
  getHighRiskFactors,
  getFactorTrend,
  getAssessmentReportStatus,
  waitAssessmentReport,
  isReportWaitCompleted,
  isReportWaitFailed
};
