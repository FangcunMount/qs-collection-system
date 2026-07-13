import { getPersonalityReport, getPersonalityReportStatus } from '@/services/api/personality';
import { waitTypologyAssessmentId } from '@/modules/assessment/services/waitTypologyAssessmentId';
import { normalizePersonalityAssessmentRecord } from '@/services/api/personality';
import { resolveTesteeIdForAnswerSheet } from '@/modules/assessment/lib/resolveTesteeId';
import { assertReportReadable } from '@/modules/assessment/lib/reportReadiness';

export async function loadPersonalityReportByAssessmentId({ assessmentId, testeeId }) {
  if (!assessmentId || !testeeId) {
    throw new Error('参数不完整');
  }

  const status = await getPersonalityReportStatus({ assessmentId, testeeId });
  assertReportReadable(status);
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

  const matched = await waitTypologyAssessmentId(testeeId, answersheetId, {
    ...lookupOptions,
    returnMatchedItem: true,
  });
  const assessment = normalizePersonalityAssessmentRecord(matched);
  if (!assessment?.id) {
    throw new Error('报告尚未生成，请稍后再试');
  }
  const assessmentId = String(assessment.id);
  const report = await loadPersonalityReportByAssessmentId({ assessmentId, testeeId });

  return {
    report,
    assessmentId,
    testeeId,
  };
}
