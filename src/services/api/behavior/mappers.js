/**
 * collection-server 行为能力测评 API 响应归一化。
 */

export const unwrapResponse = (result) => {
  if (!result) return result;
  if (result.data !== undefined && result.data !== null) return result.data;
  return result;
};

export const toStringId = (value) => {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
};

export const normalizeBehaviorReportStatus = (raw = {}) => {
  const data = unwrapResponse(raw) || raw || {};
  return {
    status: String(data.status || '').toLowerCase(),
    stage: String(data.stage || data.status || '').toLowerCase(),
    message: data.message || '',
    reason: data.reason || '',
    nextPollAfterMs: Number(data.next_poll_after_ms) > 0 ? Number(data.next_poll_after_ms) : 0,
    retryAfterMs: Number(data.retry_after_ms) > 0 ? Number(data.retry_after_ms) : 0,
    raw: data,
  };
};

export const extractBehaviorAssessmentList = (payload = {}) => {
  const data = unwrapResponse(payload) || payload || {};
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.assessments)) return data.assessments;
  if (Array.isArray(data)) return data;
  return [];
};

export const normalizeBehaviorAssessmentListItem = (raw = {}) => ({
  id: toStringId(raw.id),
  answer_sheet_id: toStringId(raw.answer_sheet_id || raw.answersheet_id || raw.answerSheetId),
  testee_id: toStringId(raw.testee_id || raw.testeeId),
  status: raw.status || '',
  raw,
});

export const normalizeBehaviorAssessmentRecord = (raw = {}) => {
  const item = raw || {};
  const model = item.model || {};
  const primaryScore = item.primary_score || {};
  const level = item.level || {};

  return {
    id: toStringId(item.id),
    answer_sheet_id: toStringId(item.answer_sheet_id || item.answersheet_id || item.answerSheetId),
    testee_id: toStringId(item.testee_id || item.testeeId),
    title: item.model_name || model.title || item.questionnaire_code || model.code || '行为能力测评',
    description: item.model_code || model.code || item.questionnaire_code || '',
    createtime: item.submitted_at || item.created_at || item.interpreted_at || '',
    status: item.status || '',
    score: primaryScore.value ?? item.total_score ?? item.score ?? null,
    risk_level: item.risk_level || item.riskLevel || level.code || null,
    questionnaire_code: item.questionnaire_code || '',
    questionnaire_version: item.questionnaire_version || '',
    scale_code: item.model_code || model.code || item.questionnaire_code || '',
    scale_name: item.model_name || model.title || '',
    model_code: item.model_code || model.code || '',
    model_name: item.model_name || model.title || '',
    interpreted_at: item.interpreted_at || '',
    assessment_kind: 'ability',
    kind: 'ability',
    model_extra: item.model_extra || item.modelExtra || null,
    raw: item,
  };
};

/**
 * 行为能力报告与现有通用报告展示层之间的适配边界。
 */
export const mapBehaviorReportPayload = (reportPayload = {}) => {
  const report = unwrapResponse(reportPayload) || {};
  const model = report.model || {};
  const primaryScore = report.primary_score || {};
  const level = report.level || {};

  return {
    data: {
      ...report,
      scale_name: report.scale_name || report.model_name || model.title || '',
      scale_code: report.scale_code || report.model_code || model.code || '',
      total_score: primaryScore.value ?? report.total_score ?? null,
      risk_level: report.risk_level || level.code || '',
      dimensions: Array.isArray(report.dimensions) ? report.dimensions : [],
      suggestions: Array.isArray(report.suggestions) ? report.suggestions : [],
    },
  };
};
