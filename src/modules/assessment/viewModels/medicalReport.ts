import type { MedicalReportViewModel } from "../types";

type Source = Record<string, unknown>;

const asSource = (value: unknown): Source => value && typeof value === "object"
  ? value as Source
  : {};
const asText = (value: unknown): string => value == null ? "" : String(value);
const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isPersonalityReportPayload = (raw: unknown): boolean => {
  const wrapper = asSource(raw);
  const report = asSource(wrapper.data || raw);
  return Boolean(report.model_extra || report.modelExtra);
};

export const buildMedicalReportViewModel = (
  raw: unknown,
  fallbackTestee?: { id?: string; legalName?: string; name?: string } | null,
): MedicalReportViewModel => {
  const wrapper = asSource(raw);
  const report = asSource(wrapper.data || raw);
  const model = asSource(report.model);
  const sourceSuggestions = Array.isArray(report.suggestions) ? report.suggestions : [];
  const sourceDimensions = Array.isArray(report.dimensions) ? report.dimensions : [];
  const totalScore = asNumber(report.total_score);
  const testeeName = asText(report.testee_name)
    || fallbackTestee?.legalName
    || fallbackTestee?.name
    || "";
  const testeeId = asText(report.testee_id) || asText(fallbackTestee?.id);

  const suggestions = sourceSuggestions.map((value) => {
    const item = asSource(value);
    return {
      category: asText(item.category),
      content: asText(item.content),
      factorCode: item.factor_code ? asText(item.factor_code) : undefined,
    };
  });
  const factors = sourceDimensions.map((value) => {
    const dimension = asSource(value);
    return {
      factorCode: asText(dimension.factor_code),
      title: asText(dimension.factor_name),
      content: asText(dimension.description),
      score: asNumber(dimension.raw_score),
      maxScore: asNumber(dimension.max_score),
      riskLevel: asText(dimension.risk_level),
      suggestion: asText(dimension.suggestion),
    };
  });

  return {
    tone: "medical",
    scaleName: asText(report.scale_name || report.model_name || model.title),
    scaleCode: asText(report.scale_code || report.model_code || model.code),
    riskLevel: asText(report.risk_level),
    suggestions,
    createdAt: asText(report.created_at),
    testeeName,
    testeeId,
    total: totalScore === null ? null : {
      content: asText(report.conclusion),
      score: totalScore,
    },
    factors,
    hasContent: totalScore !== null || factors.length > 0 || suggestions.length > 0,
  };
};
