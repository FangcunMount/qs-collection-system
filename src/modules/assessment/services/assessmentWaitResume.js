export const ASSESSMENT_DELAY_MS = 60000;

const asTimestamp = (value) => {
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

export function resolveAssessmentWaitResume(context = {}, now = Date.now()) {
  const currentTime = asTimestamp(now) || Date.now();
  const persistedStartedAt = asTimestamp(context.assessmentWaitStartedAt);
  const phase = String(context.phase || '');

  if (phase === 'delayed') {
    return {
      phase: 'delayed',
      stage: 'assessment_delayed',
      message: '答卷已接收，测评生成延迟',
      startedAt: Math.min(
        persistedStartedAt || currentTime - ASSESSMENT_DELAY_MS,
        currentTime - ASSESSMENT_DELAY_MS,
      ),
    };
  }

  return {
    phase: 'processing',
    stage: phase === 'assessment_ready' || phase === 'report_processing'
      ? 'report_processing'
      : 'assessment_pending',
    message: phase === 'assessment_ready' || phase === 'report_processing'
      ? '正在生成测评报告，请稍候...'
      : '正在生成测评记录，请稍候...',
    startedAt: persistedStartedAt > 0 && persistedStartedAt <= currentTime
      ? persistedStartedAt
      : currentTime,
  };
}

export function resolveAssessmentStatusPhase(currentPhase, stage) {
  if (stage === 'assessment_delayed') return 'delayed';
  if (stage === 'assessment_pending' && currentPhase === 'delayed') return 'delayed';
  if (currentPhase === 'degraded') return 'degraded';
  return 'processing';
}

