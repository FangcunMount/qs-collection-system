import { createIdempotencyKey } from '@/shared/lib/requestId';
import { sha256 } from '@/shared/lib/sha256';

const normalizeAnswer = (answer = {}) => ({
  question_code: String(answer.question_code || ''),
  question_type: String(answer.question_type || ''),
  value: stableValue(answer.value),
});

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value ?? null;
};

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildCanonicalSubmission = (payload = {}) => {
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const normalizedAnswers = answers
    .map(normalizeAnswer)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    questionnaire_code: String(payload.questionnaire_code || ''),
    questionnaire_version: String(payload.questionnaire_version || ''),
    testee_id: String(payload.testee_id || ''),
    task_id: String(payload.task_id || ''),
    answers: normalizedAnswers,
  };
};

export function buildLegacySubmissionFingerprint(payload = {}) {
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const normalizedAnswers = answers
    .map(answer => ({
      question_code: String(answer.question_code || ''),
      question_type: String(answer.question_type || ''),
      score: answer.score ?? 0,
      value: String(answer.value ?? ''),
    }))
    .sort((left, right) => left.question_code.localeCompare(right.question_code));
  return stableHash(JSON.stringify({
    questionnaire_code: String(payload.questionnaire_code || ''),
    questionnaire_version: String(payload.questionnaire_version || ''),
    testee_id: String(payload.testee_id || ''),
    task_id: String(payload.task_id || ''),
    answers: normalizedAnswers,
  }));
}

/**
 * 同一份作答重试的本地标识。仅保存摘要，不持久化原始答案。
 */
export function buildSubmissionFingerprint(payload = {}) {
  return `v2:${sha256(JSON.stringify(buildCanonicalSubmission(payload)))}`;
}

export function createSubmissionAttempt(payload = {}) {
  return {
    fingerprint: buildSubmissionFingerprint(payload),
    idempotencyKey: createIdempotencyKey(),
  };
}

/**
 * 答案快照未变化时只复用幂等键；每次 HTTP 尝试必须生成新的 request ID。
 */
export function resolveSubmissionAttempt(payload = {}, previousAttempt = null, forceNewAttempt = false) {
  const fingerprint = buildSubmissionFingerprint(payload);
  const previousFingerprint = String(previousAttempt?.fingerprint || '');
  const matchesCurrent = previousFingerprint === fingerprint;
  const matchesLegacy = !previousFingerprint.startsWith('v2:')
    && previousFingerprint === buildLegacySubmissionFingerprint(payload);
  if (
    !forceNewAttempt
    && (matchesCurrent || matchesLegacy)
    && previousAttempt?.idempotencyKey
  ) {
    return { fingerprint, idempotencyKey: previousAttempt.idempotencyKey };
  }

  return createSubmissionAttempt(payload);
}

export default {
  buildSubmissionFingerprint,
  buildLegacySubmissionFingerprint,
  createSubmissionAttempt,
  resolveSubmissionAttempt,
};
