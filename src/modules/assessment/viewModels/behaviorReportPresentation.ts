import type {
  BehaviorReportFactorViewModel,
  BehaviorReportLevelViewModel,
  BehaviorReportViewModel,
} from "../types";

export type BehaviorReportFamily = "brief2" | "spm" | "generic";
export type BehaviorFactorPalette = "mint" | "blue" | "green" | "violet" | "amber";

export interface BehaviorFactorPresentation {
  factor: BehaviorReportFactorViewModel;
  icon: string;
  palette: BehaviorFactorPalette;
  statusLabel: string;
  scoreValue: number | null;
  scoreKind: "t_score" | "raw_score";
}

export interface BehaviorReportPresentation {
  family: BehaviorReportFamily;
  familyLabel: string;
  chartTitle: string;
  heroMessage: string;
  summaryScore: number | null;
  summaryScoreLabel: string;
  summaryHeadline: string;
  chartFactors: BehaviorFactorPresentation[];
  portraitFactors: BehaviorFactorPresentation[];
  chartCallout: string;
}

interface FactorMeta {
  icon: string;
  palette: BehaviorFactorPalette;
  role?: "index" | "total";
}

const PALETTES: BehaviorFactorPalette[] = ["mint", "blue", "green", "violet", "amber"];

const BRIEF2_META: Record<string, FactorMeta> = {
  p3o50jxo: { icon: "停", palette: "mint" },
  aa7ibyhn: { icon: "察", palette: "blue" },
  njktu8bm: { icon: "换", palette: "violet" },
  ayvitzpm: { icon: "心", palette: "green" },
  tox3nsdt: { icon: "启", palette: "mint" },
  ci01dlwx: { icon: "记", palette: "blue" },
  n279wv33: { icon: "序", palette: "green" },
  wji5vcpx: { icon: "检", palette: "amber" },
  c5t60lqa: { icon: "整", palette: "violet" },
  cy73vuwv: { icon: "行", palette: "mint", role: "index" },
  "93ictrs1": { icon: "情", palette: "green", role: "index" },
  gbkiykiq: { icon: "认", palette: "blue", role: "index" },
  xtwk5rcb: { icon: "总", palette: "violet", role: "total" },
  bri: { icon: "行", palette: "mint", role: "index" },
  eri: { icon: "情", palette: "green", role: "index" },
  cri: { icon: "认", palette: "blue", role: "index" },
  gec: { icon: "总", palette: "violet", role: "total" },
};

const SPM_META: Record<string, FactorMeta> = {
  hwyaqcsd: { icon: "社", palette: "mint" },
  tprrr0hh: { icon: "视", palette: "blue" },
  jxzqkop3: { icon: "听", palette: "green" },
  hs5rky8b: { icon: "触", palette: "violet" },
  "2oensr1f": { icon: "身", palette: "amber" },
  wztnmkjk: { icon: "衡", palette: "mint" },
  oaj20o9n: { icon: "序", palette: "blue" },
  dxncfrnq: { icon: "总", palette: "violet", role: "total" },
  tot: { icon: "总", palette: "violet", role: "total" },
};

const normalizedCode = (factor: BehaviorReportFactorViewModel): string => factor.factorCode.trim().toLowerCase();

const detectFamily = (report: BehaviorReportViewModel): BehaviorReportFamily => {
  const hints = [
    report.modelCode,
    report.modelName,
    ...report.factors.map((factor) => factor.normReference?.tableVersion || ""),
  ].join(" ").toLowerCase();
  if (/brief[\s_-]?2|gxkk9w/.test(hints)) return "brief2";
  if (/spm[\s_-]?sensory|bjfki3|感觉统合|感觉处理/.test(hints)) return "spm";
  return "generic";
};

const factorMeta = (
  family: BehaviorReportFamily,
  factor: BehaviorReportFactorViewModel,
  index: number,
): FactorMeta => {
  const code = normalizedCode(factor);
  const known = family === "brief2" ? BRIEF2_META[code] : family === "spm" ? SPM_META[code] : undefined;
  if (known) return known;
  if (/总分|总体|综合执行|\bgec\b|\btot\b/i.test(factor.title)) {
    return { icon: "总", palette: "violet", role: "total" };
  }
  if (family === "brief2" && /行为调节|情绪调节|认知调节|\bbri\b|\beri\b|\bcri\b/i.test(factor.title)) {
    return { icon: factor.title.slice(0, 1) || "指", palette: PALETTES[index % PALETTES.length], role: "index" };
  }
  return {
    icon: factor.title.trim().slice(0, 1) || "能",
    palette: PALETTES[index % PALETTES.length],
  };
};

export const behaviorLevelLabel = (level: BehaviorReportLevelViewModel | null): string =>
  level?.label || level?.code || "未提供结果等级";

export const behaviorScoreLabel = (kind: string): string => ({
  t_score: "T 分",
  raw_score: "原始分",
  percentile: "百分位",
  standard_score: "标准分",
}[kind] || kind || "得分");

const factorPresentation = (
  family: BehaviorReportFamily,
  factor: BehaviorReportFactorViewModel,
  index: number,
): BehaviorFactorPresentation => {
  const meta = factorMeta(family, factor, index);
  return {
    factor,
    icon: meta.icon,
    palette: meta.palette,
    statusLabel: behaviorLevelLabel(factor.level),
    scoreValue: factor.tScore ?? factor.rawScore,
    scoreKind: factor.tScore === null ? "raw_score" : "t_score",
  };
};

export const buildBehaviorReportPresentation = (
  report: BehaviorReportViewModel,
): BehaviorReportPresentation => {
  const family = detectFamily(report);
  const presentations = report.factors.map((factor, index) => factorPresentation(family, factor, index));
  const withRole = presentations.map((item, index) => ({
    item,
    role: factorMeta(family, item.factor, index).role,
  }));
  const leafFactors = withRole.filter(({ role }) => !role).map(({ item }) => item);
  const overviewFactors = withRole.filter(({ role }) => role === "index" || role === "total").map(({ item }) => item);
  const totalFactor = withRole.find(({ role }) => role === "total")?.item;
  const normLeafFactors = leafFactors.filter((item) => item.factor.tScore !== null && item.factor.normReference?.scoreKind === "t_score");
  const normOverviewFactors = overviewFactors.filter((item) => item.factor.tScore !== null && item.factor.normReference?.scoreKind === "t_score");
  const chartFactors = family === "brief2" && normOverviewFactors.length
    ? normOverviewFactors
    : normLeafFactors.length ? normLeafFactors : presentations.filter((item) => item.factor.tScore !== null);
  const totalTScore = totalFactor?.factor.tScore ?? null;
  const summaryScore = report.primaryScore?.value ?? totalTScore;

  return {
    family,
    familyLabel: family === "brief2" ? "执行功能" : family === "spm" ? "感觉处理" : "行为能力",
    chartTitle: family === "brief2"
      ? "核心指数与常模基准"
      : family === "spm" ? "感觉处理维度与常模基准" : "因子得分与常模基准",
    heroMessage: "结合本次结果，了解日常表现与支持方向",
    summaryScore,
    summaryScoreLabel: report.primaryScore
      ? `${report.primaryScore.label ? `${report.primaryScore.label} · ` : ""}${behaviorScoreLabel(report.primaryScore.kind)}`
      : totalTScore !== null ? `${totalFactor?.factor.title || "总分"} · T 分` : "本次得分",
    summaryHeadline: behaviorLevelLabel(report.level),
    chartFactors,
    // Index and total dimensions can also contain interpretation and advice.
    portraitFactors: presentations,
    chartCallout: "图表展示本次 T 分与报告提供的常模基准，结果等级以报告文字为准。",

  };
};
