import {
  resolveAssessmentStatusPhase,
  resolveAssessmentWaitResume,
} from '../assessmentWaitResume';

describe('assessment wait restart recovery', () => {
  test('restores legacy delayed context without restarting the 60 second clock', () => {
    expect(resolveAssessmentWaitResume({ phase: 'delayed' }, 100000)).toEqual({
      phase: 'delayed',
      stage: 'assessment_delayed',
      message: '答卷已接收，测评生成延迟',
      startedAt: 40000,
    });
  });

  test('preserves a valid persisted wait start timestamp', () => {
    expect(resolveAssessmentWaitResume({
      phase: 'answersheet_accepted',
      assessmentWaitStartedAt: 1234,
    }, 100000)).toMatchObject({
      phase: 'processing',
      startedAt: 1234,
    });
  });

  test('keeps delayed sticky for assessment pending but releases it for report processing', () => {
    expect(resolveAssessmentStatusPhase('delayed', 'assessment_pending')).toBe('delayed');
    expect(resolveAssessmentStatusPhase('delayed', 'assessment_delayed')).toBe('delayed');
    expect(resolveAssessmentStatusPhase('delayed', 'scoring')).toBe('processing');
  });

  test('restores readiness failure as terminal until the user explicitly retries', () => {
    expect(resolveAssessmentWaitResume({
      phase: 'assessment_failed',
      statusMessage: '模型校验失败',
      assessmentWaitStartedAt: 1234,
    }, 100000)).toEqual({
      phase: 'failure',
      stage: 'assessment_failed',
      message: '模型校验失败',
      startedAt: 1234,
    });
  });
});
