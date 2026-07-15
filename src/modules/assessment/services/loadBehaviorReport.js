import { getBehaviorReport, getBehaviorReportStatus } from '@/services/api/behavior';
import { resolveTesteeIdForAnswerSheet } from '@/modules/assessment/lib/resolveTesteeId';
import { assertReportReadable } from '@/modules/assessment/lib/reportReadiness';
import { waitBehaviorAssessmentId } from './waitBehaviorAssessmentId';

export async function ensureBehaviorReportReadable({ assessmentId, testeeId }) {
  const status = await getBehaviorReportStatus({ assessmentId, testeeId });
  return assertReportReadable(status);
}

export async function loadBehaviorReportByAssessmentId({ assessmentId, testeeId }) {
  if (!assessmentId || !testeeId) throw new Error('参数不完整');

  await ensureBehaviorReportReadable({ assessmentId, testeeId });
  const report = await getBehaviorReport({ assessmentId, testeeId });
  return {
    report,
    assessmentId: String(assessmentId),
    testeeId: String(testeeId),
  };
}

export async function loadBehaviorReportByAnswerSheet({
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
  if (!testeeId) throw new Error('缺少受试者信息，无法加载报告');

  const assessmentId = await waitBehaviorAssessmentId(testeeId, answersheetId, lookupOptions);
  const { report } = await loadBehaviorReportByAssessmentId({ assessmentId, testeeId });
  return {
    report,
    assessmentId: String(assessmentId),
    testeeId: String(testeeId),
  };
}
