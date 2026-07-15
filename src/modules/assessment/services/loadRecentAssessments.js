import { loadMedicalAssessmentRecords } from './loadMedicalAssessmentRecords';
import { normalizeMedicalAssessmentRecord } from './medicalAssessmentRecordMapper';
import { isReportReadable } from '@/modules/assessment/lib/reportReadiness';
import { isMedicalAssessmentKind } from '@/shared/lib/assessmentKind';

const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * 首页「最近测评报告」：仅展示正文可读取的医学量表报告。
 */
export async function loadRecentAssessments(testeeId, { pageSize = 3 } = {}) {
  if (!testeeId) {
    return [];
  }

  const medicalResult = await loadMedicalAssessmentRecords({
    testeeId,
    page: 1,
    pageSize,
  });
  const medicalItems = medicalResult.unavailable
    ? []
    : (medicalResult.items || []).map(normalizeMedicalAssessmentRecord);

  return medicalItems
    .filter((item) => isMedicalAssessmentKind(item.assessment_kind || item.kind))
    .filter((item) => isReportReadable(item.status))
    .sort((a, b) => {
      return toTimestamp(b.submitted_at || b.created_at || b.updated_at)
        - toTimestamp(a.submitted_at || a.created_at || a.updated_at);
    })
    .slice(0, pageSize);
}
