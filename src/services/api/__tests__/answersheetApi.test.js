import { request } from '../../servers';
import { submitAnswersheet, waitForAssessmentReadiness } from '../answersheetApi';

jest.mock('../../servers', () => ({ request: jest.fn() }));
jest.mock('@tarojs/taro', () => ({
  __esModule: true,
  default: {
    canIUse: () => false,
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  },
}));

describe('answersheet reliable API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses a new persisted request ID for each retry with the same idempotency key', async () => {
    request
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({ status: 'accepted', request_id: 'server-request', answersheet_id: '42' });
    const prepared = [];
    const result = await submitAnswersheet({ questionnaire_code: 'Q', idempotency_key: 'idem-12345678' }, {
      maxAttempts: 2,
      delay: async () => {},
      onAttemptPrepared: attempt => prepared.push(attempt),
    });
    expect(result.answersheet_id).toBe('42');
    expect(prepared).toHaveLength(2);
    expect(prepared[0].requestId).not.toBe(prepared[1].requestId);
    expect(prepared.map(item => item.idempotencyKey)).toEqual(['idem-12345678', 'idem-12345678']);
    expect(request.mock.calls[0][2].header['X-Request-Id']).toBe(prepared[0].requestId);
    expect(request.mock.calls[1][2].header['X-Request-Id']).toBe(prepared[1].requestId);
  });

  test('does not retry 409 conflicts', async () => {
    request.mockRejectedValueOnce({ statusCode: 409 });
    await expect(submitAnswersheet({ idempotency_key: 'idem-12345678' }, {
      maxAttempts: 3,
      delay: async () => {},
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('continues pending readiness after 60 seconds and reports delayed state', async () => {
    const delayed = jest.fn();
    let active = true;
    const now = jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(61000);
    const result = await waitForAssessmentReadiness('42', '7', {
      fetchReadiness: async () => ({ status: 'pending', answersheet_id: '42', next_poll_after_ms: 2000 }),
      delay: async () => { active = false; },
      shouldContinue: () => active,
      onDelayed: delayed,
    });
    now.mockRestore();
    expect(result).toBeNull();
    expect(delayed).toHaveBeenCalled();
  });

  test('recovers from a transient 503 and returns ready', async () => {
    const fetchReadiness = jest.fn()
      .mockRejectedValueOnce({ statusCode: 503, retryAfterMs: 1 })
      .mockResolvedValueOnce({ status: 'ready', answersheet_id: '42', assessment_id: '99' });
    await expect(waitForAssessmentReadiness('42', '7', {
      fetchReadiness,
      delay: async () => {},
    })).resolves.toMatchObject({ status: 'ready', assessment_id: '99' });
  });
});
