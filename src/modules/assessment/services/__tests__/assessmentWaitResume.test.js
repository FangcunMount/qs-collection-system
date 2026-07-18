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
});
