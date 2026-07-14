import { parseDateSafe } from "@/shared/lib/dateFormatters";
import { resolveAssessmentKind } from "@/shared/lib/assessmentKind";
import { getRiskConfig } from "@/shared/lib/statusFormatters";
import { normalizeCatalogLabel } from "@/modules/catalog/viewModels/catalogCard";

export type HomeRiskTone = "normal" | "low" | "medium" | "high";

export interface RecentAssessmentViewModel {
  id: string;
  answerSheetId: string;
  title: string;
  completedAt: string;
  scaleCode: string;
  tag: string;
  score: number | "";
  riskLevel: string;
  riskTone: HomeRiskTone;
  riskLabel: string;
  icon: string;
  status: unknown;
  assessmentKind: string;
  testeeId: string;
  raw: Record<string, unknown>;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" ? value as Record<string, unknown> : {}
);

const resolveRecentAssessmentTitle = (item: Record<string, unknown>): string => {
  const model = asRecord(item.model);
  const rawTitle = normalizeCatalogLabel(
    item.scale_name
    ?? item.model_name
    ?? model.title
    ?? item.questionnaire_title
    ?? item.questionnaire_code
    ?? item.title,
  ) || "测评记录";
  const marker = rawTitle.toUpperCase();

  if (marker.includes("MBTI")) return "16 人格测评";
  if (marker.includes("SBTI")) return "SBTI 趣味小测试";
  return rawTitle;
};

export const formatHomeDateTime = (value: unknown): string => {
  if (!value) return "时间待同步";
  try {
    const date = parseDateSafe(String(value));
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
    const pad = (num: number) => `${num}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch (_error) {
    return String(value).slice(0, 16).replace("T", " ");
  }
};

export const resolveHomeRiskTone = (riskLevel: unknown): HomeRiskTone => {
  const raw = String(riskLevel || "").toLowerCase();
  if (raw.includes("high") || raw.includes("severe") || raw.includes("critical")) return "high";
  if (raw.includes("medium") || raw.includes("mid") || raw.includes("moderate")) return "medium";
  if (raw.includes("low") || raw.includes("mild")) return "low";
  return "normal";
};

const resolveRiskLabel = (riskLevel: unknown): string => {
  const tone = resolveHomeRiskTone(riskLevel);
  if (tone === "high") return "偏高";
  if (tone === "medium") return "中等偏高";
  return "良好";
};

export const mapRecentAssessment = (
  value: unknown,
  index: number,
  icons: readonly string[],
): RecentAssessmentViewModel | null => {
  if (!value || typeof value !== "object") return null;
  const item = asRecord(value);
  const riskLevel = normalizeCatalogLabel(item.risk_level ?? item.riskLevel);
  const riskConfig = getRiskConfig(riskLevel || "normal");
  const scoreValue = item.total_score ?? item.score ?? item.raw_score;
  const numericScore = Number(scoreValue);
  const riskTone = resolveHomeRiskTone(riskLevel);
  const categoryTag = normalizeCatalogLabel(item.stage_label ?? item.category_name ?? item.scale_category);

  return {
    id: normalizeCatalogLabel(item.id),
    answerSheetId: normalizeCatalogLabel(item.answer_sheet_id ?? item.answersheet_id ?? item.answerSheetId),
    title: resolveRecentAssessmentTitle(item),
    completedAt: formatHomeDateTime(item.submitted_at ?? item.completed_at ?? item.created_at ?? item.updated_at),
    scaleCode: normalizeCatalogLabel(item.scale_code ?? item.questionnaire_code ?? item.code),
    tag: categoryTag || (riskTone === "normal" ? "健康状态" : riskConfig.label) || "健康状态",
    score: scoreValue === undefined || scoreValue === null || scoreValue === "" || Number.isNaN(numericScore)
      ? ""
      : Math.round(numericScore),
    riskLevel,
    riskTone,
    riskLabel: resolveRiskLabel(riskLevel),
    icon: icons.length ? icons[index % icons.length] : "",
    status: item.status,
    assessmentKind: String(resolveAssessmentKind(item) || ""),
    testeeId: normalizeCatalogLabel(item.testee_id ?? item.testeeId),
    raw: item,
  };
};
