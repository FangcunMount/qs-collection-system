import Taro from '@tarojs/taro';

export const SUBMISSION_CONTEXT_STORAGE_KEY = 'collection_submission_context';

const toId = (value) => (value === undefined || value === null || value === '' ? '' : String(value));

export function normalizeSubmissionContext(value = {}) {
	const legacyRequestId = toId(value.requestId || value.request_id);
	const legacyClientRequestId = toId(value.clientRequestId || value.client_request_id);
  return {
    fingerprint: toId(value.fingerprint),
		requestId: legacyRequestId || legacyClientRequestId,
		lastRequestId: toId(value.lastRequestId || value.last_request_id || legacyClientRequestId || legacyRequestId),
    acceptedRequestId: toId(value.acceptedRequestId || value.accepted_request_id),
    idempotencyKey: toId(value.idempotencyKey || value.idempotency_key),
		clientRequestId: legacyClientRequestId,
    testeeId: toId(value.testeeId || value.testee_id),
    modelCode: toId(value.modelCode || value.model_code),
    questionnaireCode: toId(value.questionnaireCode || value.questionnaire_code),
    questionnaireVersion: toId(value.questionnaireVersion || value.questionnaire_version),
    assessmentKind: toId(value.assessmentKind || value.assessment_kind),
    answersheetId: toId(value.answersheetId || value.answersheet_id),
    assessmentId: toId(value.assessmentId || value.assessment_id),
    phase: toId(value.phase) || 'submit_prepared',
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

export function saveSubmissionContext(value = {}, options = {}) {
  const next = normalizeSubmissionContext({ ...getSubmissionContext(), ...value, updatedAt: Date.now() });
  try {
    Taro.setStorageSync(SUBMISSION_CONTEXT_STORAGE_KEY, next);
  } catch (_) {
	if (options.required) {
		throw new Error('无法保存提交凭据，请释放存储空间后重试');
	}
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
