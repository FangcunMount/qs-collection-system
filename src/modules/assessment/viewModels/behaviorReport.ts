import type {
  BehaviorReportLevelViewModel,
  BehaviorReportNormReferenceViewModel,
  BehaviorReportScoreViewModel,
  BehaviorReportViewModel,
} from "../types";

type Source = Record<string, unknown>;

const isSource = (value: unknown): value is Source => Boolean(value) && typeof value === "object";
const asSource = (value: unknown): Source => isSource(value) ? value : {};
const asText = (value: unknown): string => value == null ? "" : String(value);
const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildScore = (value: unknown): BehaviorReportScoreViewModel | null => {
  if (!isSource(value)) return null;
  const score = asNumber(value.value);
  if (score === null) return null;
  return {
    kind: asText(value.kind).toLowerCase(),
    value: score,
    label: asText(value.label),
    max: asNumber(value.max),
  };
};

const buildLevel = (value: unknown): BehaviorReportLevelViewModel | null => {
  if (!isSource(value)) return null;
  const code = asText(value.code);
  const label = asText(value.label);
  const severity = asText(value.severity);
  if (!code && !label && !severity) return null;
  return { code, label, severity };
};

const buildLegacyLevel = (value: unknown): BehaviorReportLevelViewModel | null => {
  const code = asText(value);
  return code ? { code, label: "", severity: code } : null;
};

const buildNormReference = (value: unknown): BehaviorReportNormReferenceViewModel | null => {
  if (!isSource(value)) return null;
  const benchmark = asNumber(value.benchmark);
  if (benchmark === null) return null;
  return {
    scoreKind: asText(value.score_kind).toLowerCase(),
    benchmark,
    tableVersion: asText(value.table_version),
    formVariant: asText(value.form_variant),
    minAgeMonths: asNumber(value.min_age_months),
    maxAgeMonths: asNumber(value.max_age_months),
    gender: asText(value.gender),
  };
};

export const buildBehaviorReportViewModel = (
  raw: unknown,
  fallbackTestee?: { id?: string; legalName?: string; name?: string } | null,
): BehaviorReportViewModel => {
  const wrapper = asSource(raw);
  const report = asSource(wrapper.data || raw);
  const model = asSource(report.model);
  const primaryScore = buildScore(report.primary_score);
  const legacyTotalScore = asNumber(report.total_score);
  const resolvedPrimaryScore = primaryScore || (legacyTotalScore === null ? null : {
    kind: "raw_score",
    value: legacyTotalScore,
    label: "",
    max: null,
  });
  const reportLevel = buildLevel(report.level) || buildLegacyLevel(report.risk_level);
  const sourceDimensions = Array.isArray(report.dimensions) ? report.dimensions : [];
  const sourceSuggestions = Array.isArray(report.suggestions) ? report.suggestions : [];

  const factors = sourceDimensions.map((value) => {
    const dimension = asSource(value);
    const derivedScores = (Array.isArray(dimension.derived_scores) ? dimension.derived_scores : [])
      .map(buildScore)
      .filter((score): score is BehaviorReportScoreViewModel => score !== null);
    const derivedScore = (kind: string) => derivedScores.find((score) => score.kind === kind)?.value ?? null;
    return {
      factorCode: asText(dimension.factor_code),
      title: asText(dimension.factor_name),
      description: asText(dimension.description),
      suggestion: asText(dimension.suggestion),
      rawScore: asNumber(dimension.raw_score),
      maxScore: asNumber(dimension.max_score),
      derivedScores,
      tScore: derivedScore("t_score"),
      percentile: derivedScore("percentile"),
      standardScore: derivedScore("standard_score"),
      level: buildLevel(dimension.level) || buildLegacyLevel(dimension.risk_level),
      normReference: buildNormReference(dimension.norm_reference),
    };
  });

  const suggestions = sourceSuggestions.map((value) => {
    const item = asSource(value);
    return {
      category: asText(item.category),
      content: asText(item.content),
      factorCode: item.factor_code ? asText(item.factor_code) : undefined,
    };
  });
  const testeeName = asText(report.testee_name)
    || fallbackTestee?.legalName
    || fallbackTestee?.name
    || "";
  const testeeId = asText(report.testee_id) || asText(fallbackTestee?.id);

  return {
    tone: "ability",
    modelName: asText(report.model_name || report.scale_name || model.title),
    modelCode: asText(report.model_code || report.scale_code || model.code),
    createdAt: asText(report.created_at),
    testeeName,
    testeeId,
    conclusion: asText(report.conclusion),
    primaryScore: resolvedPrimaryScore,
    level: reportLevel,
    factors,
    suggestions,
    hasNormComparison: factors.some((factor) => (
      factor.tScore !== null && factor.normReference?.scoreKind === "t_score"
    )),
    hasContent: Boolean(resolvedPrimaryScore)
      || Boolean(report.conclusion)
      || factors.length > 0
      || suggestions.length > 0,
  };
};
