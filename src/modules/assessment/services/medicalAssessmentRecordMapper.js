/**
 * collection 医学量表列表 DTO → 记录卡片 ViewModel。
 * 新版 outcome 投影使用 model / primary_score / level；保留旧字段兼容历史响应。
 */
export const normalizeMedicalAssessmentRecord = (item = {}) => {
  const model = item.model || {};
  const primaryScore = item.primary_score || {};
  const level = item.level || {};

  return {
    id: item.id,
    answer_sheet_id: item.answer_sheet_id,
    title: item.scale_name || item.model_name || model.title || item.questionnaire_code || '未知量表',
    description: item.scale_code || item.model_code || model.code || item.questionnaire_code || '',
    createtime: item.submitted_at || item.created_at,
    status: item.status,
    score: primaryScore.value ?? item.total_score ?? item.score ?? null,
    risk_level: item.risk_level || item.riskLevel || level.code || null,
    questionnaire_code: item.questionnaire_code,
    questionnaire_version: item.questionnaire_version,
    questionnaire_type: item.questionnaire_type || item.questionnaireType,
    scale_code: item.scale_code || model.code,
    scale_name: item.scale_name || model.title,
    model_code: item.model_code || model.code,
    model_name: item.model_name || model.title,
    interpreted_at: item.interpreted_at,
    origin_type: item.origin_type,
    assessment_kind: item.assessment_kind
      || item.assessmentKind
      || item.kind
      || model.kind
      || item.origin_type
      || 'medical',
    kind: item.assessment_kind
      || item.assessmentKind
      || item.kind
      || model.kind
      || item.origin_type
      || 'medical',
    model_extra: item.model_extra || item.modelExtra,
  };
};
