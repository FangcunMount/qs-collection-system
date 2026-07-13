import { getAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { getSelectedTesteeId } from '@/shared/stores/testees';
import { serializeAnswerValue } from '@/modules/questionnaire/lib/answerSerializer';
import {
  hasAnyAnsweredQuestion,
  SUBMIT_NO_ANSWER_MESSAGE,
} from '@/modules/questionnaire/lib/questionUtils';
import { submitAssessmentAndResolveAnswersheet } from '@/modules/assessment/services/submitAssessmentFlow';
import { saveSubmissionContext } from '@/modules/assessment/services/submissionContextStore';
import { resolveSubmissionAttempt } from '@/modules/assessment/services/submissionAttempt';
import { getLogger } from '../../shared/lib/logger';

const logger = getLogger('questionnaire_submission_api');

/**
 * 提交答卷 - collection.yaml: POST /answersheets
 */
// eslint-disable-next-line no-unused-vars
export const submitQuestionnaire = async (questionnaire, writer_role_code, signid, lifecycle = {}, options = {}) => {
  const submitContract = options.submitContract || {};
  const selectedTesteeId = String(submitContract.testee_id || getSelectedTesteeId() || '');
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

  const submissionAttempt = options.idempotencyKey && options.requestId
    ? {
      fingerprint: options.submissionAttempt?.fingerprint || '',
      idempotencyKey: options.idempotencyKey,
      requestId: options.requestId,
    }
    : resolveSubmissionAttempt(
      requestData,
      options.submissionAttempt,
      options.forceNewSubmission === true
    );
  const idempotencyKey = submissionAttempt.idempotencyKey;
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
  let submitResult;
  try {
    submitResult = await submitAssessmentAndResolveAnswersheet(requestData, {
      idempotencyKey,
      requestId: submissionAttempt.requestId,
      waitForCompletion: questionnaire.type === 'Survey',
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
  } catch (error) {
    if (error && typeof error === 'object') {
      error.submissionAttempt = submissionAttempt;
    }
    throw error;
  }

  const finalAnswersheetId = submitResult?.answersheet_id ?? submitResult?.id;
  const queued = Boolean(submitResult?.queued);
  const requestId = submitResult?.request_id;

  if (questionnaire.type !== 'Survey') {
    if (!requestId) {
      throw new Error('提交已受理但缺少 request_id，无法继续等待');
    }
    saveSubmissionContext({
      fingerprint: submissionAttempt.fingerprint,
      requestId,
      idempotencyKey,
      clientRequestId: submissionAttempt.requestId,
      testeeId: selectedTesteeId,
      modelCode: submitContract.model_code,
      questionnaireCode: requestData.questionnaire_code,
      questionnaireVersion: requestData.questionnaire_version,
      assessmentKind: questionnaire.type === 'PersonalityAssessment' ? 'personality' : 'medical',
      answersheetId: submitResult?.answersheet_id,
      assessmentId: submitResult?.assessment_id,
      phase: submitResult?.assessment_id ? 'assessment_ready' : 'submit_queued',
    });
  }

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
    id: finalAnswersheetId ? String(finalAnswersheetId) : '',
    request_id: requestId,
    idempotency_key: idempotencyKey,
    client_request_id: submissionAttempt.requestId,
    submission_attempt: submissionAttempt,
    queued,
    submit_mode: queued ? 'queued' : 'immediate',
  };
};

export const submitQuestionsheet = submitQuestionnaire;

export default {
  submitQuestionnaire,
  submitQuestionsheet
};
