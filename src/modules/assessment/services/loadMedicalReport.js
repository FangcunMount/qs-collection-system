import { getMedicalAssessmentReport } from '@/services/api/assessmentApi';
import { waitMedicalAssessmentId } from '@/modules/assessment/services/waitMedicalAssessmentId';
import { resolveTesteeIdForAnswerSheet } from '@/modules/assessment/lib/resolveTesteeId';

export async function loadMedicalReportByAssessmentId({ assessmentId, testeeId }) {
  if (!assessmentId || !testeeId) {
    throw new Error('参数不完整');
  }

  const report = await getMedicalAssessmentReport(assessmentId, testeeId);

  return {
    report,
    assessmentId: String(assessmentId),
    testeeId: String(testeeId),
  };
}

/**
 * 一次性兼容：仅 `a` 导航参数且无 aid 时，经 medical 列表匹配 assessment_id 后加载报告。
 */
export async function loadMedicalReportByAnswerSheet({
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

  const assessmentId = await waitMedicalAssessmentId(testeeId, answersheetId, lookupOptions);
  const report = await getMedicalAssessmentReport(assessmentId, testeeId);

  return {
    report,
    assessmentId: String(assessmentId),
    testeeId: String(testeeId),
  };
}
