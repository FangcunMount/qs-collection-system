/** 答卷可靠受理与就绪查询 API */
import { request } from '../servers';
import config from '../../config';
import { getLogger } from '../../shared/lib/logger';
import { createIdempotencyKey, createRequestId } from '../../shared/lib/requestId';

export { createIdempotencyKey, createRequestId };

const logger = getLogger('answersheet_api');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeIDs = (result) => {
  if (!result) return result;
  const normalized = { ...result };
  for (const key of ['id', 'request_id', 'answersheet_id', 'assessment_id']) {
    if (normalized[key] !== undefined && normalized[key] !== null) normalized[key] = String(normalized[key]);
  }
  return normalized;
};

const isRetryableSubmitError = (error) => {
  const statusCode = Number(error?.statusCode || error?.code || 0);
  return statusCode === 429 || statusCode === 503 || statusCode === 0 || String(error?.code || '') === '-1';
};

/**
 * 提交答卷。所有自动重试复用同一 idempotency_key，每次 HTTP 尝试使用独立 X-Request-Id；409 不重试。
 */
export const submitAnswersheet = async (data, options = {}) => {
  const payload = { ...data };
  const idempotencyKey = payload.idempotency_key || options.idempotencyKey || createIdempotencyKey();
  const requestId = options.requestId || createRequestId();
  payload.idempotency_key = idempotencyKey;

  logger.RUN('[submitAnswersheet] 发起可靠提交', {
    questionnaireCode: payload.questionnaire_code,
    questionnaireVersion: payload.questionnaire_version,
    testeeId: payload.testee_id,
    answerCount: payload.answers?.length ?? 0,
    idempotencyKey,
    requestId,
  });

  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelay = options.delay || delay;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptRequestId = attempt === 1 ? requestId : createRequestId();
    options.onAttemptPrepared?.({ attempt, requestId: attemptRequestId, idempotencyKey });
    try {
      const result = await request('/answersheets', payload, {
        host: config.collectionHost,
        method: 'POST',
        needToken: true,
        suppressErrorToast: attempt < maxAttempts,
        header: { 'X-Request-Id': attemptRequestId },
      });
      const normalized = normalizeIDs(result);
      if (String(normalized?.status || '').toLowerCase() !== 'accepted' || !normalized?.answersheet_id) {
        throw new Error('答卷受理响应缺少 accepted 状态或 answersheet_id');
      }
      return { ...normalized, client_request_id: attemptRequestId };
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableSubmitError(error)) throw error;
      await retryDelay(Math.max(Number(error?.retryAfterMs || 0), 1000));
    }
  }
  throw new Error('答卷提交重试耗尽');
};

export const getAssessmentReadiness = (answerSheetId, testeeId) => {
  if (!answerSheetId || !testeeId) {
    return Promise.reject(new Error('answersheet_id 或 testee_id 为空，无法查询测评就绪状态'));
  }
  return request(`/answersheets/${String(answerSheetId)}/assessment-readiness`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: { testee_id: String(testeeId) },
  }).then(normalizeIDs);
};

export const waitForAssessmentReadiness = async (answerSheetId, testeeId, options = {}) => {
  const currentTime = Date.now();
  const configuredStartedAt = Number(options.startedAt || 0);
  const startedAt = Number.isFinite(configuredStartedAt)
    && configuredStartedAt > 0
    && configuredStartedAt <= currentTime
    ? configuredStartedAt
    : currentTime;
  const fetchReadiness = options.fetchReadiness || getAssessmentReadiness;
  const wait = options.delay || delay;
  for (let attempt = 1; ; attempt += 1) {
    if (options.shouldContinue?.() === false) return null;
    let readiness;
    try {
      readiness = await fetchReadiness(answerSheetId, testeeId);
    } catch (error) {
      const code = Number(error?.statusCode || error?.code || 0);
      if (code !== 429 && code !== 503 && code !== 0 && String(error?.code || '') !== '-1') throw error;
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= 60000) options.onDelayed?.(elapsedMs, error);
      await wait(Math.max(Number(error?.retryAfterMs || 0), 1000));
      continue;
    }
    const status = String(readiness?.status || '').toLowerCase();
    const elapsedMs = Date.now() - startedAt;
    options.onAttempt?.(attempt, readiness, elapsedMs);
    if (status === 'ready') {
      if (!readiness.assessment_id) throw new Error('测评就绪协议异常：ready 状态缺少 assessment_id');
      return readiness;
    }
    if (status === 'no_assessment_required' || status === 'failed') return readiness;
    if (status !== 'pending') throw new Error(`测评就绪协议异常：未知状态 ${status || '<empty>'}`);
    if (elapsedMs >= 60000) options.onDelayed?.(elapsedMs, readiness);
    await wait(Number(readiness.next_poll_after_ms) > 0 ? Number(readiness.next_poll_after_ms) : 2000);
  }
};

/** 获取答卷详情（原始数据）。 */
export const getAnswersheet = (id, options = {}) => {
  const { showLoading = true } = options;
  return new Promise((resolve, reject) => {
    request(`/answersheets/${String(id)}`, {}, {
      host: config.collectionHost,
      needToken: true,
      isNeedLoading: showLoading
    })
      .then((result) => {
        let si = 1;
        const processedAnswers = (result.answers || []).map(v => {
          if (v.type !== 'Section') {
            v.title = `${si}. ${v.title}`;
            si += 1;
          }
          switch (v.type) {
            case 'Radio':
            case 'ImageRadio':
            case 'ScoreRadio':
            case 'Select': {
              const optionIndex = v.options.findIndex(o => o.is_select == '1');
              v.value = optionIndex > -1 ? v.options[optionIndex].code : '';
              break;
            }
            case 'CheckBox':
            case 'ImageCheckBox':
              v.value = v.options.filter(o => o.is_select == '1').map(o => o.code);
              break;
            default:
              break;
          }
          return v;
        });
        resolve({
          ...result,
          id: String(result.id),
          testee_id: String(result.testee_id),
          ...(result.assessment_id && { assessment_id: String(result.assessment_id) }),
          answers: processedAnswers,
        });
      })
      .catch(reject);
  });
};

/** 轮询用：仅取答卷元数据，不加工题目列表。 */
export const fetchAnswersheetRecord = async (id, { showLoading = false } = {}) => {
  const result = await request(`/answersheets/${String(id)}`, {}, {
    host: config.collectionHost,
    needToken: true,
    isNeedLoading: showLoading,
  });
  const data = result?.data !== undefined ? result.data : result;
  return data && typeof data === 'object' ? data : {};
};

export const extractAssessmentIdFromAnswersheet = (payload = {}) => {
  const data = payload?.data !== undefined ? payload.data : payload;
  const assessmentId = data?.assessment_id ?? data?.assessmentId ?? data?.assessment?.id ?? '';
  return assessmentId ? String(assessmentId) : '';
};

export default {
  submitAnswersheet,
  getAssessmentReadiness,
  waitForAssessmentReadiness,
  getAnswersheet,
  fetchAnswersheetRecord,
  extractAssessmentIdFromAnswersheet,
};
