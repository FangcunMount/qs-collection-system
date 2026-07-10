import { getAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { getSelectedTesteeId } from '@/shared/stores/testees';
import { createIdempotencyKey } from './answersheetApi';
import { serializeAnswerValue } from '@/modules/questionnaire/lib/answerSerializer';
import {
  hasAnyAnsweredQuestion,
  SUBMIT_NO_ANSWER_MESSAGE,
} from '@/modules/questionnaire/lib/questionUtils';
import { submitAssessmentAndResolveAnswersheet } from '@/modules/assessment/services/submitAssessmentFlow';
import { getLogger } from '../../shared/lib/logger';

const logger = getLogger('questionnaire_submission_api');

/**
 * 提交答卷 - collection.yaml: POST /answersheets
 */
// eslint-disable-next-line no-unused-vars
export const submitQuestionnaire = async (questionnaire, writer_role_code, signid, lifecycle = {}, options = {}) => {
  const submitContract = options.submitContract || {};
  const selectedTesteeId = submitContract.testee_id || getSelectedTesteeId();
  if (!selectedTesteeId) {
    throw new Error('请先选择档案');
  }

  if (!hasAnyAnsweredQuestion(questionnaire.answers)) {
    throw new Error(SUBMIT_NO_ANSWER_MESSAGE);
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
  submitQuestionnaire,
  submitQuestionsheet
};
