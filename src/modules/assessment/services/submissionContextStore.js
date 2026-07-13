import Taro from '@tarojs/taro';

export const SUBMISSION_CONTEXT_STORAGE_KEY = 'collection_submission_context';

const toId = (value) => (value === undefined || value === null || value === '' ? '' : String(value));

export function normalizeSubmissionContext(value = {}) {
  return {
    fingerprint: toId(value.fingerprint),
    requestId: toId(value.requestId || value.request_id),
    idempotencyKey: toId(value.idempotencyKey || value.idempotency_key),
    clientRequestId: toId(value.clientRequestId || value.client_request_id),
    testeeId: toId(value.testeeId || value.testee_id),
    modelCode: toId(value.modelCode || value.model_code),
    questionnaireCode: toId(value.questionnaireCode || value.questionnaire_code),
    questionnaireVersion: toId(value.questionnaireVersion || value.questionnaire_version),
    assessmentKind: toId(value.assessmentKind || value.assessment_kind),
    answersheetId: toId(value.answersheetId || value.answersheet_id),
    assessmentId: toId(value.assessmentId || value.assessment_id),
    phase: toId(value.phase) || 'submit_queued',
    updatedAt: Number(value.updatedAt || value.updated_at || Date.now()),
  };
}

export function getSubmissionContext() {
  try {
    return normalizeSubmissionContext(Taro.getStorageSync(SUBMISSION_CONTEXT_STORAGE_KEY) || {});
  } catch (_) {
    return normalizeSubmissionContext({});
  }
}

export function saveSubmissionContext(value = {}) {
  const next = normalizeSubmissionContext({ ...getSubmissionContext(), ...value, updatedAt: Date.now() });
  try {
    Taro.setStorageSync(SUBMISSION_CONTEXT_STORAGE_KEY, next);
  } catch (_) {
    // 本地存储失败不阻塞当前提交流程，路由参数仍可恢复主链路。
  }
  return next;
}

export function clearSubmissionContext() {
  try {
    Taro.removeStorageSync(SUBMISSION_CONTEXT_STORAGE_KEY);
  } catch (_) {
    // ignore storage cleanup errors
  }
}
