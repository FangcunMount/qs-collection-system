import {
  listPersonalityAssessments,
  extractPersonalityAssessmentList,
  normalizePersonalityAssessmentRecord,
} from '@/services/api/personality';
import { loadMedicalAssessmentRecords } from './loadMedicalAssessmentRecords';

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
  model: { kind: 'typology', code: record.model_code },
});

/**
 * 首页「最近测评」：人格走 typology-assessments；医学列表接口未上线时自动忽略。
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
  const medicalItems = medicalResult.unavailable ? [] : (medicalResult.items || []);

  return [...typologyItems, ...medicalItems]
    .sort((a, b) => {
      return toTimestamp(b.submitted_at || b.created_at || b.updated_at)
        - toTimestamp(a.submitted_at || a.created_at || a.updated_at);
    })
    .slice(0, pageSize);
}
