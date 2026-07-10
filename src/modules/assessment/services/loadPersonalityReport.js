import { getPersonalityReport } from '@/services/api/personality';
import { waitTypologyAssessmentId } from '@/modules/assessment/services/waitTypologyAssessmentId';
import { resolveTesteeIdForAnswerSheet } from '@/modules/assessment/lib/resolveTesteeId';

export async function loadPersonalityReportByAssessmentId({ assessmentId, testeeId }) {
  if (!assessmentId || !testeeId) {
    throw new Error('参数不完整');
  }

  return getPersonalityReport({ assessmentId, testeeId });
}

/**
 * 一次性兼容：仅 `a` 导航参数且无 aid 时，经 typology 列表匹配 assessment_id 后加载报告。
 */
export async function loadPersonalityReportByAnswerSheet({
  answersheetId,
  testeeIdFromUrl,
  logger,
  lookupOptions = { maxAttempts: 1 },
}) {
  const testeeId = await resolveTesteeIdForAnswerSheet({
    testeeIdFromUrl,
    answersheetId,
    logger,
  });

  if (!testeeId) {
    throw new Error('缺少受试者信息，无法加载报告');
  }

  const assessmentId = await waitTypologyAssessmentId(testeeId, answersheetId, lookupOptions);
  const report = await getPersonalityReport({ assessmentId, testeeId });

  return {
    report,
    assessmentId,
    testeeId,
  };
}
