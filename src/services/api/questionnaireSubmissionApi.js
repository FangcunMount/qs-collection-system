import { boolToOneZero } from '../../shared/lib/coercion';
import { getAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { getSelectedTesteeId } from '@/shared/stores/testees';
import { request } from '../servers';
import { submitAnswersheet, waitForSubmitCompletion } from './answersheetApi';
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
export const submitQuestionnaire = async (questionnaire, writer_role_code, signid, lifecycle = {}) => {
  // 注意：writer_role_code 和 signid 参数保留是为了兼容旧调用方式，新 API 不使用这些参数
  const selectedTesteeId = getSelectedTesteeId();
  if (!selectedTesteeId) {
    throw new Error('请先选择档案');
  }

  // 转换答案格式：从旧格式转为新格式
  const answers = questionnaire.answers
    .filter(v => v.type !== 'Section') // 过滤掉章节
    .map(v => {
      let value = '';
      
      // 根据题目类型转换答案值
      switch (v.type) {
        case 'Radio':
        case 'ScoreRadio':
        case 'ImageRadio':
        case 'Select':
          // 单选：直接使用选中的 code
          value = v.value || '';
          break;
          
        case 'CheckBox':
        case 'ImageCheckBox':
          // 多选：将数组转为 JSON 字符串
          value = JSON.stringify(v.value || []);
          break;
          
        case 'Text':
        case 'Textarea':
        case 'Number':
        case 'Date':
          // 文本类：直接使用值
          value = String(v.value || '');
          break;
          
        default:
          value = String(v.value || '');
      }

      return {
        question_code: v.code,
        question_type: v.type,
        value: value,
        score: v.score || 0
      };
    });

  // 构建新 API 的请求数据
  const requestData = {
    questionnaire_code: questionnaire.code,
    questionnaire_version: questionnaire.version || '1.0',
    testee_id: selectedTesteeId, // 保持原始格式，避免精度丢失
    answers: answers,
    title: questionnaire.name || questionnaire.title
  };

  const entryContext = getAssessmentEntryContext();
  if (entryContext?.task_id) {
    requestData.task_id = entryContext.task_id;
  }

  logger.RUN('[submitQuestionnaire] 开始提交', {
    questionnaireCode: requestData.questionnaire_code,
    questionnaireVersion: requestData.questionnaire_version,
    testeeId: requestData.testee_id,
    answerCount: requestData.answers.length,
    hasTaskId: Boolean(requestData.task_id)
  });

  const submitResult = await submitAnswersheet(requestData);
  const queued = Boolean(submitResult?.request_id) &&
    !submitResult?.answersheet_id &&
    typeof submitResult?.id === 'undefined';

  const requestId = submitResult?.request_id || submitResult?.id;
  if (!requestId) {
    throw new Error('提交失败：未获取到 request_id');
  }

  if (queued) {
    logger.WARN('[submitQuestionnaire] 提交已入队，等待异步处理', {
      requestId,
      status: submitResult?.status ?? 'queued'
    });
    if (typeof lifecycle?.onQueued === 'function') {
      lifecycle.onQueued({ requestId, submitResult });
    }
  } else {
    logger.RUN('[submitQuestionnaire] 提交已直接完成', {
      requestId,
      answersheetId: submitResult?.answersheet_id ?? submitResult?.id ?? null
    });
  }

  let finalAnswersheetId = submitResult?.answersheet_id ?? null;
  if (!finalAnswersheetId && !submitResult?.request_id) {
    finalAnswersheetId = submitResult?.id ?? null;
  }

  if (!finalAnswersheetId) {
    const statusResult = await waitForSubmitCompletion(requestId, {
      onProgress: (progress) => {
        logger.RUN('[submitQuestionnaire] 队列处理中', {
          requestId,
          attempt: progress.attempt,
          maxAttempts: progress.maxAttempts,
          status: progress.status
        });
        if (typeof lifecycle?.onQueueProgress === 'function') {
          lifecycle.onQueueProgress(progress);
        }
      },
      onSuccess: (result) => {
        logger.RUN('[submitQuestionnaire] 队列处理完成', {
          requestId,
          answersheetId: result?.answersheet_id ?? null
        });
        if (typeof lifecycle?.onQueueCompleted === 'function') {
          lifecycle.onQueueCompleted({ requestId, statusResult: result });
        }
      }
    });
    finalAnswersheetId = statusResult?.answersheet_id;
  }

  if (!finalAnswersheetId) {
    throw new Error('提交失败：未获取到答卷编号');
  }

  logger.RUN('[submitQuestionnaire] 提交结束', {
    requestId,
    answersheetId: finalAnswersheetId,
    mode: queued ? 'queued' : 'immediate'
  });

  return {
    ...submitResult,
    id: String(finalAnswersheetId),
    request_id: requestId,
    queued,
    submit_mode: queued ? 'queued' : 'immediate'
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
