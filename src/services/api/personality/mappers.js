/**
 * collection-server 人格测评 API 响应归一化
 */

export const unwrapResponse = (result) => {
  if (!result) return result;
  if (result.data !== undefined && result.data !== null) {
    return result.data;
  }
  return result;
};

export const toStringId = (value) => {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
};

const normalizeIdFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  const next = { ...obj };
  fields.forEach((field) => {
    if (next[field] !== undefined && next[field] !== null) {
      next[field] = toStringId(next[field]);
    }
  });
  return next;
};

const normalizeStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

export const normalizePersonalityModel = (raw = {}) => {
  const model = normalizeIdFields(raw, ['id', 'questionnaire_id']);
  const familyCode = model.family_code || model.familyCode || model.model_family || '';
  const catalogLayout = model.catalog_layout || model.catalogLayout || model.layout || model.display_slot || '';
  const gains = normalizeStringList(model.gains || model.benefits);
  const suitableFor = normalizeStringList(model.suitable_for || model.suitableFor || model.audience);
  const tags = Array.isArray(model.tags) ? model.tags : [];
  const hero = model.hero && typeof model.hero === 'object' ? model.hero : null;

  return {
    id: toStringId(model.id),
    code: model.code || model.model_code || '',
    title: model.title || model.name || '',
    subtitle: model.subtitle || '',
    description: model.description || '',
    category: model.category || '',
    familyCode,
    catalogLayout,
    theme: model.theme || model.ui_theme || '',
    cardBadge: model.card_badge || model.cardBadge || '',
    sortOrder: model.sort_order ?? model.sortOrder ?? null,
    isFeatured: Boolean(model.is_featured ?? model.isFeatured),
    recommended: Boolean(model.recommended ?? model.is_recommended ?? model.isRecommended),
    questionnaireCode: model.questionnaire_code || '',
    questionnaireVersion: model.questionnaire_version || '',
    questionCount: model.question_count ?? model.questionCount ?? null,
    durationMin: model.duration_min ?? model.durationMin ?? null,
    tags,
    gains,
    suitableFor,
    disclaimer: model.disclaimer || '',
    cta: model.cta || '',
    hero,
    thumbnail: model.thumbnail || '',
    status: model.status || '',
    raw: model,
  };
};

export const mapPublishedModelToCatalogItem = (raw = {}) => {
  const model = normalizePersonalityModel(raw);
  const code = model.code;
  const title = model.title || code;
  const tags = model.tags || [];
  const hero = model.hero || {};

  return {
    key: model.familyCode ? String(model.familyCode).toLowerCase() : String(code || '').toLowerCase(),
    modelCode: code,
    familyCode: model.familyCode,
    catalogLayout: model.catalogLayout,
    isFeatured: model.isFeatured,
    sortOrder: model.sortOrder,
    badge: model.category || '人格探索',
    title,
    shortTitle: title,
    headline: title,
    subtitle: model.subtitle || '',
    description: model.description || model.subtitle || '',
    intro: model.description || model.subtitle || '',
    questionCount: model.questionCount,
    durationMin: model.durationMin,
    tags,
    gains: model.gains.length ? model.gains : tags,
    suitableFor: model.suitableFor.length ? model.suitableFor : tags,
    disclaimer: model.disclaimer || '测评结果用于自我探索与沟通参考，不作为医学诊断依据。',
    hero: {
      kicker: hero.kicker || model.category || 'PERSONALITY',
      title: hero.title || title,
      subtitle: hero.subtitle || model.subtitle || model.description || '',
      sticker: hero.sticker || tags.slice(0, 3).join(' · '),
    },
    theme: model.theme || 'default',
    cardBadge: model.cardBadge || '',
    cta: model.cta || `开始${title}测评`,
    raw: model.raw,
  };
};

export const normalizeQuestionnaire = (raw = {}) => {
  const questionnaire = { ...raw };
  if (questionnaire.id !== undefined) {
    questionnaire.id = toStringId(questionnaire.id);
  }
  return questionnaire;
};

export const normalizeSubmitContract = (contract = {}, model = {}) => ({
  questionnaire_code:
    contract.questionnaire_code ||
    contract.questionnaireCode ||
    model.questionnaire_code ||
    model.questionnaireCode ||
    '',
  questionnaire_version:
    contract.questionnaire_version ||
    contract.questionnaireVersion ||
    model.questionnaire_version ||
    model.questionnaireVersion ||
    '',
  testee_id: toStringId(contract.testee_id || contract.testeeId || ''),
  model_code: contract.model_code || contract.modelCode || model.code || '',
  kind: contract.kind || contract.assessment_kind || 'personality',
});

export const normalizePersonalitySession = (raw) => {
  const session = unwrapResponse(raw) || {};
  const model = normalizePersonalityModel(session.model || {});
  const questionnaire = normalizeQuestionnaire(session.questionnaire || {});
  const submitContract = normalizeSubmitContract(session.submit_contract || session.submitContract || {}, model);

  return {
    model,
    questionnaire,
    submitContract,
    endpoints: session.endpoints || {},
    raw: session,
  };
};

export const normalizeSubmitDone = (result = {}) => {
  const data = unwrapResponse(result) || {};
  const answersheetId = toStringId(data.answersheet_id || data.id || '');
  const assessmentId = toStringId(data.assessment_id || '');
  return {
    answersheetId,
    assessmentId,
    requestId: toStringId(data.request_id || ''),
    status: data.status || '',
    raw: data,
  };
};

export const normalizeWaitReportStatus = (raw = {}) => {
  const data = unwrapResponse(raw) || {};
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
