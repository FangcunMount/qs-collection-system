// Display-only estimate shared by the catalog and questionnaire preparation.
// Published minutes take precedence; missing evidence stays unknown.
export function configuredAssessmentMinutes(source?: Record<string, unknown> | null): number {
  for (const key of ["estimated_time", "duration_min", "durationMin", "estimated_duration"]) {
    const value = source?.[key];
    if (typeof value !== "number" && typeof value !== "string") continue;
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes > 0) return minutes;
  }
  return 0;
}

export function estimateAssessmentMinutes(
  questionCount: number,
  configuredMinutes = 0,
  minutesPerQuestion = 0.5,
): number | null {
  if (Number.isFinite(configuredMinutes) && configuredMinutes > 0) {
    return Math.ceil(configuredMinutes);
  }
  if (!Number.isFinite(questionCount) || questionCount <= 0
    || !Number.isFinite(minutesPerQuestion) || minutesPerQuestion <= 0) return null;
  return Math.ceil(questionCount * minutesPerQuestion);
}

export function formatAssessmentDuration(questionCount: number, configuredMinutes = 0): string {
  const minutes = estimateAssessmentMinutes(questionCount, configuredMinutes);
  return minutes === null ? "用时待确认" : `约 ${minutes} 分钟`;
}
