import { normalizeSubmissionContext } from '../submissionContextStore';

jest.mock('@tarojs/taro', () => ({
  __esModule: true,
  default: {},
}));

describe('submission context compatibility', () => {
  test('reads legacy request fields without confusing accepted and latest attempts', () => {
    expect(normalizeSubmissionContext({
      requestId: 'legacy-request',
      clientRequestId: 'legacy-client',
      idempotencyKey: 'idem-existing',
    })).toMatchObject({
      requestId: 'legacy-request',
      lastRequestId: 'legacy-client',
      acceptedRequestId: '',
      clientRequestId: 'legacy-client',
      idempotencyKey: 'idem-existing',
    });
  });

  test('keeps the accepted response request ID separate from a later HTTP attempt', () => {
    expect(normalizeSubmissionContext({
      request_id: 'compat-request',
      last_request_id: 'latest-attempt',
      accepted_request_id: 'accepted-attempt',
    })).toMatchObject({
      requestId: 'compat-request',
      lastRequestId: 'latest-attempt',
      acceptedRequestId: 'accepted-attempt',
    });
  });

  test('reads the optional assessment wait start timestamp compatibly', () => {
    expect(normalizeSubmissionContext({
      assessment_wait_started_at: 123456,
    })).toMatchObject({
      assessmentWaitStartedAt: 123456,
    });
    expect(normalizeSubmissionContext({}).assessmentWaitStartedAt).toBe(0);
  });

  test('preserves readiness terminal message for page recovery', () => {
    expect(normalizeSubmissionContext({
      phase: 'assessment_failed',
      status_message: '模型校验失败',
    })).toMatchObject({
      phase: 'assessment_failed',
      statusMessage: '模型校验失败',
    });
  });
});
