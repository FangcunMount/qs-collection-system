/**
 * 答卷 API
 */

import { request } from '../servers';
import config from '../../config';
import { getLogger } from '../../shared/lib/logger';

const logger = getLogger('answersheet_api');

const normalizeSubmitResult = (result) => {
  if (!result) {
    return result;
  }

  const normalized = { ...result };
  if (typeof normalized.id !== 'undefined') {
    normalized.id = String(normalized.id);
  }
  if (typeof normalized.answersheet_id !== 'undefined') {
    normalized.answersheet_id = String(normalized.answersheet_id);
  }
  if (typeof normalized.assessment_id !== 'undefined') {
    normalized.assessment_id = String(normalized.assessment_id);
  }

  return normalized;
};

/**
 * 提交答卷（新 API）
 * ⚠️ ID 精度保护：答卷 ID 已转换为字符串，避免 JavaScript 数字精度问题
 * @param {Object} data - 答卷数据
 * @param {Array} data.answers - 答案列表
 * @param {string} data.questionnaire_code - 问卷编码
 * @param {string} data.questionnaire_version - 问卷版本
 * @param {number} data.testee_id - 受试者ID
 * @param {string} data.title - 答卷标题（可选）
 * @returns {Promise<{id: string, message: string}>} ID 已转换为字符串
 */
export const submitAnswersheet = (data) => {
  logger.RUN('[submitAnswersheet] 发起提交', {
    host: config.collectionHost,
    questionnaireCode: data?.questionnaire_code,
    questionnaireVersion: data?.questionnaire_version,
    testeeId: data?.testee_id,
    answerCount: data?.answers?.length ?? 0,
    hasTaskId: Boolean(data?.task_id)
  });

  return request('/answersheets', data, {
    host: config.collectionHost,
    method: 'POST',
    needToken: true
  }).then(result => {
    const normalized = normalizeSubmitResult(result);

    if (normalized?.request_id && !normalized?.answersheet_id && typeof normalized?.id === 'undefined') {
      logger.WARN('[submitAnswersheet] collection 已受理，进入队列', {
        requestId: normalized.request_id,
        status: normalized.status ?? 'queued'
      });
      return normalized;
    }

    logger.RUN('[submitAnswersheet] collection 直接返回结果', {
      answersheetId: normalized?.answersheet_id ?? normalized?.id ?? null,
      assessmentId: normalized?.assessment_id ?? null
    });

    // ⚠️ ID 精度保护：将数字 ID 转换为字符串，避免 JavaScript 大数精度丢失
    // 后端返回的 ID 可能是数字类型，但由于 JavaScript 整数精度限制（2^53），
    // 大于此值的 ID 会丢失精度。统一转换为字符串可避免此问题。
    return normalized;
  }).catch(error => {
    logger.ERROR('[submitAnswersheet] 提交失败', {
      questionnaireCode: data?.questionnaire_code,
      testeeId: data?.testee_id,
      error: error?.message ?? error?.errmsg ?? String(error)
    });
    throw error;
  });
};

const SUBMIT_STATUS_POLL_INTERVAL = 2000;
const SUBMIT_STATUS_MAX_ATTEMPTS = 30;
const SUBMIT_STATUS_FAILURES = new Set(['failed', 'error', 'rejected', 'cancelled', 'canceled']);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getSubmitStatus = (requestId) => {
  if (!requestId) {
    return Promise.reject(new Error('request_id 为空，无法查询提交状态'));
  }

  return request('/answersheets/submit-status', {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
    params: { request_id: requestId }
  }).then(result => {
    const normalized = normalizeSubmitResult(result);
    logger.RUN('[getSubmitStatus] 查询提交状态', {
      requestId,
      status: normalized?.status ?? 'unknown',
      answersheetId: normalized?.answersheet_id ?? null
    });
    return normalized;
  });
};

export const waitForSubmitCompletion = async (requestId, options = {}) => {
  const interval = options.interval ?? SUBMIT_STATUS_POLL_INTERVAL;
  const maxAttempts = options.maxAttempts ?? SUBMIT_STATUS_MAX_ATTEMPTS;
  const onProgress = options.onProgress;
  const onSuccess = options.onSuccess;

  if (!requestId) {
    throw new Error('缺少 request_id，无法等待提交结果');
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    const currentAttempt = attempts + 1;
    const statusResult = await getSubmitStatus(requestId);
    const normalizedStatus = (statusResult?.status || '').toLowerCase();

    if (typeof onProgress === 'function') {
      onProgress({
        requestId,
        attempt: currentAttempt,
        maxAttempts,
        status: normalizedStatus || 'unknown',
        result: statusResult
      });
    }

    if (statusResult && statusResult.answersheet_id) {
      logger.RUN('[waitForSubmitCompletion] 队列处理完成', {
        requestId,
        answersheetId: statusResult.answersheet_id,
        attempt: currentAttempt
      });
      if (typeof onSuccess === 'function') {
        onSuccess(statusResult);
      }
      return statusResult;
    }

    if (statusResult && SUBMIT_STATUS_FAILURES.has(normalizedStatus)) {
      logger.ERROR('[waitForSubmitCompletion] 队列处理失败', {
        requestId,
        status: normalizedStatus,
        attempt: currentAttempt
      });
      throw new Error('答卷提交处理失败，请稍后重试');
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      break;
    }

    await delay(interval);
  }

  logger.WARN('[waitForSubmitCompletion] 等待提交结果超时', {
    requestId,
    maxAttempts,
    interval
  });
  throw new Error('等待答卷提交结果超时，请稍后在答卷列表查看或重试');
};

/**
 * 获取答卷详情（原始数据）
 * 在 answersheet 页面使用
 * 使用 collection.yaml 中的合法接口: GET /answersheets/{id}
 * ⚠️ ID 精度保护：所有 ID 已转换为字符串，避免 JavaScript 数字精度问题
 * @param {string|number} id - 答卷ID（自动转为字符串避免精度问题）
 */
export const getAnswersheet = (id) => {
  return new Promise((resolve, reject) => {
    request(`/answersheets/${String(id)}`, {}, {
      host: config.collectionHost,
      needToken: true,
      isNeedLoading: true
    })
      .then((result) => {
        let si = 1;
        // 适配 collection.yaml 返回的数据结构
        const processedAnswers = result.answers.map(v => {
          if (v.type !== "Section") {
            v.title = `${si}. ${v.title}`;
            si++;
          }

          switch (v.type) {
            case 'Radio':
              const radioOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = radioOptionIndex > -1 ? v.options[radioOptionIndex].code : ''
              break;
            case 'ImageRadio':
              const imageRadioOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = imageRadioOptionIndex > -1 ? v.options[imageRadioOptionIndex].code : ''
              break;
            case 'ScoreRadio':
              const scoreOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = scoreOptionIndex > -1 ? v.options[scoreOptionIndex].code : ''
              break;
            case 'CheckBox':
              v.value = v.options.filter(o => (o.is_select == '1')).map(o => (o.code))
              break;
            case 'ImageCheckBox':
              v.value = v.options.filter(o => (o.is_select == '1')).map(o => (o.code))
              break;
            case 'Select':
              const selectOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = selectOptionIndex > -1 ? v.options[selectOptionIndex].code : ''
              break;
            default:
              break;
          }

          return v
        })
        
        // ⚠️ ID 精度保护：确保所有 ID 都是字符串格式
        const processedResult = {
          ...result,
          id: String(result.id),
          testee_id: String(result.testee_id),
          // 如果有 assessment_id，也转换为字符串
          ...(result.assessment_id && { assessment_id: String(result.assessment_id) }),
          answers: processedAnswers
        };
        
        resolve(processedResult)
      }).catch((err) => {
        reject(err)
      });
  })
}

export default {
  submitAnswersheet,
  getAnswersheet,
  getSubmitStatus,
  waitForSubmitCompletion
}
