import { createIdempotencyKey, createRequestId } from '@/shared/lib/requestId';

const normalizeAnswer = (answer = {}) => ({
  question_code: String(answer.question_code || ''),
  question_type: String(answer.question_type || ''),
  score: answer.score ?? 0,
  value: String(answer.value ?? ''),
});

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

/**
 * 同一份作答重试的本地标识。仅保存摘要，不持久化原始答案。
 */
export function buildSubmissionFingerprint(payload = {}) {
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const normalizedAnswers = answers
    .map(normalizeAnswer)
    .sort((left, right) => left.question_code.localeCompare(right.question_code));

  return stableHash(JSON.stringify({
    questionnaire_code: String(payload.questionnaire_code || ''),
    questionnaire_version: String(payload.questionnaire_version || ''),
    testee_id: String(payload.testee_id || ''),
    task_id: String(payload.task_id || ''),
    answers: normalizedAnswers,
  }));
}

export function createSubmissionAttempt(payload = {}) {
  return {
    fingerprint: buildSubmissionFingerprint(payload),
    idempotencyKey: createIdempotencyKey(),
    requestId: createRequestId(),
  };
}

/**
 * 答案快照未变化时复用同一个幂等键和客户端请求 ID；修改答案即创建新尝试。
 */
export function resolveSubmissionAttempt(payload = {}, previousAttempt = null, forceNewAttempt = false) {
  const fingerprint = buildSubmissionFingerprint(payload);
  if (
    !forceNewAttempt
    && previousAttempt?.fingerprint === fingerprint
    && previousAttempt?.idempotencyKey
    && previousAttempt?.requestId
  ) {
    return previousAttempt;
  }

  return createSubmissionAttempt(payload);
}

export default {
  buildSubmissionFingerprint,
  createSubmissionAttempt,
  resolveSubmissionAttempt,
};
