import { getAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { getSelectedTesteeId } from '@/shared/stores/testees';
import { serializeAnswerValue } from '@/modules/questionnaire/lib/answerSerializer';
import {
  hasAnyAnsweredQuestion,
  SUBMIT_NO_ANSWER_MESSAGE,
} from '@/modules/questionnaire/lib/questionUtils';
import { isEmpty } from '@/shared/lib/type';
import { resolveSubmitAssessmentKind } from '@/modules/assessment/lib/assessmentSubmitNavigation';
import { submitAssessmentAndResolveAnswersheet } from '@/modules/assessment/services/submitAssessmentFlow';
import { getSubmissionContext, saveSubmissionContext } from '@/modules/assessment/services/submissionContextStore';
import { resolveSubmissionAttempt } from '@/modules/assessment/services/submissionAttempt';
import { createRequestId } from '@/shared/lib/requestId';
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
    .filter(v => v.type !== 'Section' && !isEmpty(v.value))
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

  const submissionAttempt = options.idempotencyKey
    ? {
      fingerprint: options.submissionAttempt?.fingerprint || '',
      idempotencyKey: options.idempotencyKey,
    }
    : resolveSubmissionAttempt(
      requestData,
      options.submissionAttempt || getSubmissionContext(),
      options.forceNewSubmission === true
    );
  const idempotencyKey = submissionAttempt.idempotencyKey;
  const initialRequestId = options.requestId || createRequestId();
  let lastRequestId = initialRequestId;
  requestData.idempotency_key = idempotencyKey;

  // 必须先落盘再发出 HTTP 请求，确保响应丢失或进程重启后仍能用同一幂等键恢复。
  saveSubmissionContext({
    fingerprint: submissionAttempt.fingerprint,
    requestId: initialRequestId,
    lastRequestId: initialRequestId,
    acceptedRequestId: '',
    clientRequestId: initialRequestId,
    idempotencyKey,
    testeeId: selectedTesteeId,
    modelCode: submitContract.model_code,
    questionnaireCode: requestData.questionnaire_code,
    questionnaireVersion: requestData.questionnaire_version,
    assessmentKind: '',
    answersheetId: '',
    assessmentId: '',
    assessmentWaitStartedAt: 0,
    phase: 'submit_prepared',
  }, { required: true });

  logger.RUN('[submitQuestionnaire] 开始提交', {
    questionnaireCode: requestData.questionnaire_code,
    questionnaireVersion: requestData.questionnaire_version,
    testeeId: requestData.testee_id,
    answerCount: requestData.answers.length,
    hasTaskId: Boolean(requestData.task_id),
    idempotencyKey
  });

  let submitResult;
  const submitAssessmentKind = resolveSubmitAssessmentKind({
    questionnaireType: questionnaire.type,
    assessmentKind: submitContract.assessment_kind,
  });
  try {
    submitResult = await submitAssessmentAndResolveAnswersheet(requestData, {
      idempotencyKey,
      requestId: initialRequestId,
      onAttemptPrepared: ({ requestId: attemptRequestId, attempt }) => {
        lastRequestId = attemptRequestId;
        saveSubmissionContext({
          requestId: attemptRequestId,
          lastRequestId: attemptRequestId,
          clientRequestId: attemptRequestId,
          phase: 'submit_prepared',
        }, { required: true });
        options.onAttemptPrepared?.({ requestId: attemptRequestId, attempt, idempotencyKey });
      },
    });
  } catch (error) {
    if (error && typeof error === 'object') {
      error.submissionAttempt = submissionAttempt;
    }
    throw error;
  }

  const finalAnswersheetId = submitResult?.answersheet_id ?? submitResult?.id;
  const requestId = submitResult?.request_id || lastRequestId;
  if (!finalAnswersheetId) {
    throw new Error('答卷已返回但缺少 answersheet_id');
  }

  saveSubmissionContext({
    fingerprint: submissionAttempt.fingerprint,
    requestId,
    lastRequestId,
    acceptedRequestId: requestId,
    idempotencyKey,
    clientRequestId: lastRequestId,
    testeeId: selectedTesteeId,
    modelCode: submitContract.model_code,
    questionnaireCode: requestData.questionnaire_code,
    questionnaireVersion: requestData.questionnaire_version,
    assessmentKind: submitAssessmentKind,
    answersheetId: finalAnswersheetId,
    assessmentWaitStartedAt: Date.now(),
    phase: 'answersheet_accepted',
  });

  logger.RUN('[submitQuestionnaire] 提交结束', {
    requestId,
    answersheetId: finalAnswersheetId,
    mode: 'accepted',
  });

  return {
    ...submitResult,
    id: finalAnswersheetId ? String(finalAnswersheetId) : '',
    request_id: requestId,
    idempotency_key: idempotencyKey,
    client_request_id: lastRequestId,
    submission_attempt: submissionAttempt,
    submit_mode: 'accepted',
  };
};

export const submitQuestionsheet = submitQuestionnaire;

export default {
  submitQuestionnaire,
  submitQuestionsheet
};
