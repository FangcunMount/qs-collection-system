import { boolToOneZero } from '../../shared/lib/coercion';
import { getAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { getSelectedTesteeId } from '@/shared/stores/testees';
import { request } from '../servers';
import { createIdempotencyKey } from './answersheetApi';
import { serializeAnswerValue } from '@/modules/questionnaire/lib/answerSerializer';
import { submitAssessmentAndResolveAnswersheet } from '@/modules/assessment/services/submitAssessmentFlow';
import { getLogger } from '../../shared/lib/logger';

const logger = getLogger('questionnaire_submission_api');

// 获取量表列表
export const getQuestionnaireListLegacy = () => {
  return request('/questionsheet/list', {}, { method: 'GET' })
}

export const getQuestionnaireLegacy = (code) => {
  return new Promise((resolve, reject) => {
    request('/questionsheet/one', { code })
      .then((result) => {
        const questionnaire = result.questionnaire || result.questionsheet || result;
        let currentQuestionIndex = 1;
        questionnaire.questions = questionnaire.questions.map((v) => {
          // section 题型需要跳过（无需题号）
          if (v.type === "Section") {
            return v;
          }

          v.title = `${currentQuestionIndex}. ${v.title}`;
          currentQuestionIndex++;

          switch (v.type) {
            case 'CheckBox':
              v.value = []
              break;
            default:
              v.value = ''
              break;
          }
          return v;
        });

        resolve({ ...result, questionnaire })
      }).catch((err) => {
        reject(err)
      });
  })
}

export const postQuestionnaireLegacy = (questionnaire, writer_role_code, signid) => {
  const submitData = {}
  submitData['answersheet'] = {
    ...questionnaire,
    answers: questionnaire.answers.map(v => {
      v.question_code = v.code;

      if (v.type !== "Section") {
        v.title = v.title.slice(3);
      }

      switch (v.type) {
        case 'Radio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'ScoreRadio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'ImageRadio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'CheckBox':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(v.value.includes(o.code)) }))
          break;
        case 'ImageCheckBox':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(v.value.includes(o.code)) }))
          break;
        case 'Select':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        default:
          break;
      }

      return v
    })
  }

  if (writer_role_code) {
    submitData['writer_role_code'] = writer_role_code
  }

  if (signid) {
    submitData['signid'] = signid
  }

  const selectedTesteeId = getSelectedTesteeId()
  if (selectedTesteeId) {
    submitData['testeeid'] = selectedTesteeId
  }
  
  return request('/writeAnswerSheet/submit', submitData, { method: 'POST' })
}

/**
 * 提交问卷答卷（使用新 API）
 * @param {Object} questionnaire - 问卷数据
 * @param {string} writer_role_code - 填写人角色代码（可选，暂不使用）
 * @param {string} signid - 签名ID（可选，暂不使用）
 * @returns {Promise<{id: number, message: string}>}
 */
/**
 * 提交答卷 - 新 API 适配器
 * @param {Object} questionnaire - 问卷数据
 * @param {string} writer_role_code - 旧参数，保持兼容性，新 API 不使用
 * @param {string} signid - 旧参数，保持兼容性，新 API 不使用
 * @param {Object} lifecycle - 提交生命周期回调
 */
// eslint-disable-next-line no-unused-vars
export const submitQuestionnaire = async (questionnaire, writer_role_code, signid, lifecycle = {}, options = {}) => {
  // 注意：writer_role_code 和 signid 参数保留是为了兼容旧调用方式，新 API 不使用这些参数
  const submitContract = options.submitContract || {};
  const selectedTesteeId = submitContract.testee_id || getSelectedTesteeId();
  if (!selectedTesteeId) {
    throw new Error('请先选择档案');
  }

  const answers = questionnaire.answers
    .filter(v => v.type !== 'Section')
    .map(v => ({
      question_code: v.code,
      question_type: v.type,
      value: serializeAnswerValue(v),
      score: v.score ?? 0,
    }));

  const requestData = {
    questionnaire_code: submitContract.questionnaire_code || questionnaire.code,
    questionnaire_version: submitContract.questionnaire_version || questionnaire.version || '1.0',
    testee_id: selectedTesteeId,
    answers,
    title: questionnaire.name || questionnaire.title,
  };

  const entryContext = getAssessmentEntryContext();
  if (entryContext?.task_id) {
    requestData.task_id = entryContext.task_id;
  }

  const idempotencyKey = createIdempotencyKey();
  requestData.idempotency_key = idempotencyKey;

  logger.RUN('[submitQuestionnaire] 开始提交', {
    questionnaireCode: requestData.questionnaire_code,
    questionnaireVersion: requestData.questionnaire_version,
    testeeId: requestData.testee_id,
    answerCount: requestData.answers.length,
    hasTaskId: Boolean(requestData.task_id),
    idempotencyKey
  });

  let activeRequestId = '';
  const submitResult = await submitAssessmentAndResolveAnswersheet(requestData, {
    idempotencyKey,
    onProgress: (progress) => {
      activeRequestId = progress.requestId;
      logger.RUN('[submitQuestionnaire] 队列处理中', {
        requestId: progress.requestId,
        attempt: progress.attempt,
        maxAttempts: progress.maxAttempts,
        status: progress.status,
      });
      if (typeof lifecycle?.onQueueProgress === 'function') {
        lifecycle.onQueueProgress(progress);
      }
    },
    onSuccess: (result) => {
      if (typeof lifecycle?.onQueueCompleted === 'function') {
        lifecycle.onQueueCompleted({ requestId: activeRequestId, statusResult: result });
      }
    },
  });

  const finalAnswersheetId = submitResult?.answersheet_id ?? submitResult?.id;
  const queued = Boolean(submitResult?.queued);
  const requestId = submitResult?.request_id;

  if (queued) {
    logger.WARN('[submitQuestionnaire] 提交已入队，等待异步处理', {
      requestId,
      status: submitResult?.status ?? 'queued',
    });
    if (typeof lifecycle?.onQueued === 'function') {
      lifecycle.onQueued({ requestId, submitResult });
    }
  } else {
    logger.RUN('[submitQuestionnaire] 提交已直接完成', {
      requestId,
      answersheetId: finalAnswersheetId ?? null,
    });
  }

  logger.RUN('[submitQuestionnaire] 提交结束', {
    requestId,
    answersheetId: finalAnswersheetId,
    mode: queued ? 'queued' : 'immediate',
  });

  return {
    ...submitResult,
    id: String(finalAnswersheetId),
    request_id: requestId,
    idempotency_key: idempotencyKey,
    queued,
    submit_mode: queued ? 'queued' : 'immediate',
  };
};

export const submitQuestionsheet = submitQuestionnaire;

export default {
  getQuestionnaireListLegacy,
  getQuestionnaireLegacy,
  postQuestionnaireLegacy,
  submitQuestionnaire,
  submitQuestionsheet
}
