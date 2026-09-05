import { getRiskConfig } from "@/shared/lib/statusFormatters";

export const parseReportScore = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const formatReportScore = (value: unknown): string => {
  const score = parseReportScore(value);
  return score === null ? "未提供" : String(score);
};

export const calculateReportDelta = (current: unknown, previous: unknown): number | null => {
  const currentScore = parseReportScore(current);
  const previousScore = parseReportScore(previous);
  return currentScore === null || previousScore === null ? null : currentScore - previousScore;
};

export const getReportDeltaDirection = (delta: number): "flat" | "up" | "down" => {
  if (Math.abs(delta) < 0.01) return "flat";
  return delta > 0 ? "up" : "down";
};

export const formatReportDelta = (value: unknown): string => {
  const delta = parseReportScore(value);
  if (delta === null) return "数据不足，暂无法比较";
  const direction = getReportDeltaDirection(delta);
  if (direction === "flat") return "持平";
  return `${direction === "up" ? "上升" : "下降"} ${Math.abs(delta).toFixed(1)} 分`;
};

export const formatRiskChange = (previous: unknown, current: unknown): string => {
  const before = getRiskConfig(previous);
  const after = getRiskConfig(current);
  if (before.className === "risk-unknown" || after.className === "risk-unknown") {
    return "风险信息不足，暂无法比较";
  }
  return before.className === after.className ? "等级持平" : "等级发生变化";
};
