/**
 * 人格测评报告 DTO → 页面 ViewModel
 */

const toSuggestionList = (suggestions) => {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .map((item) => ({
      category: item.category || item.title || '',
      content: typeof item.content === 'string' ? item.content : String(item.content || item.text || ''),
    }))
    .filter((item) => item.content);
};

const mapDimension = (dimension = {}) => ({
  factor_code: dimension.factor_code || dimension.code || '',
  title: dimension.factor_name || dimension.title || dimension.name || '',
  description: dimension.description || dimension.summary || '',
  score: dimension.raw_score ?? dimension.score ?? null,
  max_score: dimension.max_score ?? dimension.maxScore ?? null,
  left_pole: dimension.left_pole || dimension.leftPole || '',
  right_pole: dimension.right_pole || dimension.rightPole || '',
  preference: dimension.preference || dimension.preferred_pole || dimension.preferredPole || '',
  strength: dimension.strength ?? dimension.preference_strength ?? dimension.preferenceStrength ?? null,
  risk_level: dimension.risk_level || dimension.riskLevel || '',
  suggestion: dimension.suggestion || '',
});

const mapSection = (section = {}) => ({
  key: section.key || section.id || section.title || '',
  title: section.title || section.name || '',
  content: section.content || section.body || section.text || '',
  items: Array.isArray(section.items) ? section.items : [],
});

const resolveOutcome = (raw = {}) => {
  const outcome = raw.outcome || raw.score_detail?.outcome || {};
  const modelExtra = raw.model_extra || raw.modelExtra || {};
  return {
    code: outcome.code || outcome.type_code || modelExtra.type_code || '',
    title: outcome.title || outcome.nickname || modelExtra.type_name || modelExtra.nickname || '',
    summary: outcome.summary || outcome.tagline || modelExtra.one_liner || modelExtra.tagline || '',
    rarityLabel: outcome.rarity_label || outcome.rarity || modelExtra.rarity?.label || modelExtra.rarity || '',
    percentile: outcome.percentile ?? null,
  };
};

export function normalizePersonalityReport(raw) {
  const report = raw?.data || raw || {};
  const modelExtra = report.model_extra || report.modelExtra || null;
  const outcome = resolveOutcome(report);

  const dimensions = (report.dimensions || []).map(mapDimension);
  const sections = (report.report_sections || report.sections || []).map(mapSection);
  const suggestions = toSuggestionList(report.suggestions);

  return {
    modelTitle: report.model_name || report.model?.title || report.scale_name || '',
    modelCode: report.model_code || report.model?.code || report.scale_code || '',
    testeeName: report.testee_name || '',
    testeeId: report.testee_id ? String(report.testee_id) : '',
    createdAt: report.created_at || '',
    outcome,
    hero: {
      conclusion: report.conclusion || outcome.summary || '',
      imageUrl:
        modelExtra?.image_url ||
        modelExtra?.imageUrl ||
        modelExtra?.illustration_url ||
        modelExtra?.cover_url ||
        '',
      modelExtra: modelExtra || {},
    },
    dimensions,
    suggestions,
    sections,
    hasContent: Boolean(
      modelExtra ||
        report.conclusion ||
        dimensions.length ||
        suggestions.length ||
        sections.length
    ),
    raw: report,
  };
}
