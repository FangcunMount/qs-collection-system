import { sha256 } from '@/shared/lib/sha256';
import {
  buildLegacySubmissionFingerprint,
  buildSubmissionFingerprint,
  resolveSubmissionAttempt,
} from '../submissionAttempt';

const payload = {
  questionnaire_code: 'Q',
  questionnaire_version: '1',
  testee_id: '7',
  task_id: 'task',
  answers: [
    { question_code: 'q2', question_type: 'Checkbox', value: ['B', 'C'], score: 2 },
    { question_code: 'q1', question_type: 'Text', value: '答案', score: 1 },
  ],
};

describe('submission attempt', () => {
  test('uses a UTF-8 compatible SHA-256 implementation', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('答案')).toHaveLength(64);
  });

  test('v2 fingerprint ignores calculated scores and answer order', () => {
    const reordered = {
      ...payload,
      answers: [
        { ...payload.answers[1], score: 99 },
        { ...payload.answers[0], score: 88 },
      ],
    };
    expect(buildSubmissionFingerprint(payload)).toMatch(/^v2:[a-f0-9]{64}$/);
    expect(buildSubmissionFingerprint(reordered)).toBe(buildSubmissionFingerprint(payload));
  });

  test('upgrades a matching legacy fingerprint without changing the idempotency key', () => {
    const resolved = resolveSubmissionAttempt(payload, {
      fingerprint: buildLegacySubmissionFingerprint(payload),
      idempotencyKey: 'idem-existing',
      requestId: 'request-old',
    });
    expect(resolved).toEqual({
      fingerprint: buildSubmissionFingerprint(payload),
      idempotencyKey: 'idem-existing',
    });
  });

  test('does not reuse request IDs and rotates the key after business content changes', () => {
    const previous = { fingerprint: buildSubmissionFingerprint(payload), idempotencyKey: 'idem-existing', requestId: 'request-old' };
    expect(resolveSubmissionAttempt(payload, previous)).toEqual({
      fingerprint: previous.fingerprint,
      idempotencyKey: 'idem-existing',
    });
    const changed = resolveSubmissionAttempt({ ...payload, task_id: 'task-2' }, previous);
    expect(changed.idempotencyKey).not.toBe('idem-existing');
    expect(changed.requestId).toBeUndefined();
  });
});
