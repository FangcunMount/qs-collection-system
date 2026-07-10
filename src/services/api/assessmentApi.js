import { request } from '../servers';
import config from '../../config';
import { pollAssessmentIdByAnswerSheet } from '@/modules/assessment/services/pollAssessmentIdByAnswerSheet';
import { createMedicalAssessmentFetchItems } from '@/modules/assessment/services/medicalAssessmentIdResolver';
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
 * @deprecated collection.yaml 未定义 GET /assessments 列表；仅医学降级路径保留，调用方须处理 404。
 */
export const getAssessments = ({
  testeeId,
  status,
  scaleCode,
  riskLevel,
  dateFrom,
  dateTo,
  assessmentKind,
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
    assessment_kind: assessmentKind,
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
 * 将 GET /assessments/{id}/scores 响应映射为报告页可消费结构。
 * collection.yaml 未定义医学 GET /assessments/{id}/report，以 scores 为正文来源。
 */
export const mapScoresToReportPayload = (scoresPayload = {}) => {
  const data = scoresPayload?.data !== undefined ? scoresPayload.data : scoresPayload;
  const scores = Array.isArray(data) ? data : [];

  const totalFactor = scores.find((item) => item.is_total_score) || scores[0] || {};
  const dimensions = scores
    .filter((item) => !item.is_total_score)
    .map((item) => ({
      factor_code: item.factor_code,
      factor_name: item.factor_name,
      description: item.conclusion || '',
      raw_score: item.raw_score,
      max_score: item.max_score,
      risk_level: item.risk_level,
      suggestion: item.suggestion || '',
    }));

  const suggestions = dimensions
    .filter((item) => item.suggestion)
    .map((item) => ({
      category: item.factor_name || item.factor_code || '',
      content: item.suggestion,
      factor_code: item.factor_code,
    }));

  return {
    data: {
      conclusion: totalFactor.conclusion || '',
      total_score: totalFactor.raw_score,
      risk_level: totalFactor.risk_level || '',
      dimensions,
      suggestions,
    },
  };
};

/**
 * @deprecated 请使用 waitMedicalAssessmentId + getAssessmentReport；保留兼容旧 import。
 * 通过答卷 ID 查询测评记录（走 GET /assessments 列表匹配，需 testee_id）
 */
export const getAssessmentByAnswersheetId = async (answersheetId, options = {}) => {
  const { testeeId, maxAttempts = 1, onAttempt, ...requestOptions } = options;
  const normalizedTesteeId = testeeId ? String(testeeId) : '';

  if (!normalizedTesteeId) {
    throw new Error('缺少 testee_id，无法通过答卷查询测评记录');
  }

  const matched = await pollAssessmentIdByAnswerSheet({
    testeeId: normalizedTesteeId,
    answerSheetId: answersheetId,
    maxAttempts,
    onAttempt,
    intervalMs: maxAttempts > 1 ? 2000 : 0,
    returnMatchedItem: true,
    fetchItems: createMedicalAssessmentFetchItems(answersheetId, normalizedTesteeId),
  });

  const payload = matched?.raw || { id: matched?.id, status: matched?.status };

  if (requestOptions.suppressErrorToast) {
    return payload;
  }

  return payload;
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
 * 获取医学测评报告正文（基于 collection.yaml 合法的 GET /assessments/{id}/scores）
 */
export const getMedicalAssessmentReport = async (id, testeeId) => {
  const result = await getAssessmentScores(id, testeeId);
  return mapScoresToReportPayload(result);
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

/** 通过答卷查测评：尚未创建时返回 pending，而非 404 */
export const isAssessmentPending = (detail) => {
  if (!detail || typeof detail !== 'object') {
    return false;
  }
  return !detail.id && String(detail.status || '').toLowerCase() === 'pending';
};

export default {
  getAssessments,
  extractAssessmentList,
  normalizeAssessmentListItem,
  mapScoresToReportPayload,
  getAssessmentByAnswersheetId,
  getAssessmentScores,
  getMedicalAssessmentReport,
  getAssessmentReport,
  getAssessmentTrendSummary,
  getHighRiskFactors,
  getFactorTrend,
  getAssessmentReportStatus,
  waitAssessmentReport,
  isReportWaitCompleted,
  isReportWaitFailed,
  isAssessmentPending
};
