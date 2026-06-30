/**
 * collection-server 人格测评 API 响应归一化
 */

import {
  applyAlgorithmPresentation,
  estimateDurationMin,
} from '@/modules/catalog/lib/personalityPresentation';

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

const ALGORITHM_CATALOG_LAYOUT = Object.freeze({
  mbti: 'featured',
  bigfive: 'deep_explore_compact',
  personality_typology: 'deep_explore_compact',
  sbti: 'secondary',
});

const ALGORITHM_THEME = Object.freeze({
  mbti: 'mbti',
  bigfive: 'ocean',
  personality_typology: 'deep',
  sbti: 'fun',
});

const ALGORITHM_BADGE_LABEL = Object.freeze({
  mbti: '16 型人格',
  sbti: '趣味探索',
  bigfive: '科学测评',
  personality_typology: '深度探索',
});

const ALGORITHM_CARD_BADGE = Object.freeze({
  personality_typology: '9',
  bigfive: '5',
});

const resolveAlgorithmBadgeLabel = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_BADGE_LABEL[key] || '';
};

const resolveCardBadgeFromAlgorithm = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_CARD_BADGE[key] || '';
};

const buildDefaultCta = (title) => {
  const trimmed = String(title || '').trim();
  if (!trimmed) return '开始测评';
  if (/测评|测试/.test(trimmed)) return `开始${trimmed}`;
  return `开始${trimmed}测评`;
};

const ALGORITHM_SORT_ORDER = Object.freeze({
  mbti: 0,
  sbti: 10,
  personality_typology: 20,
  bigfive: 30,
});

const resolveCatalogLayoutFromAlgorithm = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_CATALOG_LAYOUT[key] || 'secondary';
};

const resolveThemeFromAlgorithm = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_THEME[key] || 'default';
};

const resolveSortOrderFromAlgorithm = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_SORT_ORDER[key] ?? 100;
};

export const extractPublishedModelList = (payload = {}) => {
  if (Array.isArray(payload.models)) return payload.models;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const normalizePersonalityModel = (raw = {}) => {
  const model = normalizeIdFields(raw, ['id', 'questionnaire_id']);
  const algorithm = model.algorithm || '';
  const familyCode =
    model.family_code ||
    model.familyCode ||
    model.model_family ||
    algorithm ||
    '';
  const catalogLayout =
    model.catalog_layout ||
    model.catalogLayout ||
    model.layout ||
    model.display_slot ||
    resolveCatalogLayoutFromAlgorithm(algorithm);
  const gains = normalizeStringList(model.gains || model.benefits);
  const suitableFor = normalizeStringList(model.suitable_for || model.suitableFor || model.audience);
  const tags = Array.isArray(model.tags) ? model.tags : [];
  const hero = model.hero && typeof model.hero === 'object' ? model.hero : null;
  const sortOrder = model.sort_order ?? model.sortOrder ?? resolveSortOrderFromAlgorithm(algorithm);

  return {
    id: toStringId(model.id),
    code: model.code || model.model_code || '',
    title: model.title || model.name || '',
    subtitle: model.subtitle || '',
    description: model.description || '',
    category: model.category || '',
    algorithm,
    version: model.version || '',
    familyCode,
    catalogLayout,
    theme: model.theme || model.ui_theme || resolveThemeFromAlgorithm(algorithm),
    cardBadge: model.card_badge || model.cardBadge || '',
    sortOrder,
    isFeatured: Boolean(
      model.is_featured ??
        model.isFeatured ??
        catalogLayout === 'featured'
    ),
    recommended: Boolean(model.recommended ?? model.is_recommended ?? model.isRecommended),
    questionnaireCode: model.questionnaire_code || '',
    questionnaireVersion: model.questionnaire_version || '',
    questionCount: model.question_count ?? model.questionCount ?? null,
    durationMin:
      model.duration_min ??
      model.durationMin ??
      estimateDurationMin(model.question_count ?? model.questionCount, algorithm),
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

  const badgeLabel = resolveAlgorithmBadgeLabel(model.algorithm);

  const mapped = {
    key: model.familyCode ? String(model.familyCode).toLowerCase() : String(code || '').toLowerCase(),
    modelCode: code,
    algorithm: model.algorithm,
    version: model.version,
    familyCode: model.familyCode,
    catalogLayout: model.catalogLayout,
    isFeatured: model.isFeatured,
    sortOrder: model.sortOrder,
    badge: model.category || badgeLabel || '人格探索',
    title,
    shortTitle: title,
    headline: title,
    subtitle: model.subtitle || '',
    description: model.description || model.subtitle || '',
    intro: model.description || model.subtitle || '',
    questionCount: model.questionCount,
    durationMin: model.durationMin,
    tags,
    gains: model.gains.length ? model.gains : [],
    suitableFor: model.suitableFor.length ? model.suitableFor : [],
    disclaimer: model.disclaimer || '',
    hero: {
      kicker: hero.kicker || '',
      title: hero.title || '',
      subtitle: hero.subtitle || model.subtitle || '',
      sticker: hero.sticker || '',
    },
    theme: model.theme || resolveThemeFromAlgorithm(model.algorithm) || 'deep',
    cardBadge: model.cardBadge || resolveCardBadgeFromAlgorithm(model.algorithm),
    cta: model.cta || buildDefaultCta(title),
    raw: model.raw,
  };

  return applyAlgorithmPresentation(mapped, model.algorithm);
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
