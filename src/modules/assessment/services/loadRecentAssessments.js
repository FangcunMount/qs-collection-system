import {
  listPersonalityAssessments,
  extractPersonalityAssessmentList,
  normalizePersonalityAssessmentRecord,
} from '@/services/api/personality';
import { loadMedicalAssessmentRecords } from './loadMedicalAssessmentRecords';
import { normalizeMedicalAssessmentRecord } from './medicalAssessmentRecordMapper';
import { isReportReadable } from '@/modules/assessment/lib/reportReadiness';

const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const mapTypologyItemToSummary = (record) => ({
  id: record.id,
  answer_sheet_id: record.answer_sheet_id,
  scale_name: record.title,
  title: record.title,
  questionnaire_code: record.questionnaire_code,
  model_code: record.model_code,
  submitted_at: record.createtime,
  created_at: record.createtime,
  status: record.status,
  risk_level: record.risk_level,
  total_score: record.score,
  assessment_kind: 'personality',
  testee_id: record.testee_id,
  model: { kind: 'typology', code: record.model_code },
});

/**
 * 首页「最近测评报告」：仅展示正文可读取的已解释报告。
 */
export async function loadRecentAssessments(testeeId, { pageSize = 3 } = {}) {
  if (!testeeId) {
    return [];
  }

  const [typologyResult, medicalResult] = await Promise.all([
    listPersonalityAssessments({
      testeeId,
      page: 1,
      pageSize,
    }),
    loadMedicalAssessmentRecords({
      testeeId,
      page: 1,
      pageSize,
    }),
  ]);

  const typologyItems = extractPersonalityAssessmentList(typologyResult)
    .map(normalizePersonalityAssessmentRecord)
    .map(mapTypologyItemToSummary);
  const medicalItems = medicalResult.unavailable
    ? []
    : (medicalResult.items || []).map(normalizeMedicalAssessmentRecord);

  return [...typologyItems, ...medicalItems]
    .filter((item) => isReportReadable(item.status))
    .sort((a, b) => {
      return toTimestamp(b.submitted_at || b.created_at || b.updated_at)
        - toTimestamp(a.submitted_at || a.created_at || a.updated_at);
    })
    .slice(0, pageSize);
}
