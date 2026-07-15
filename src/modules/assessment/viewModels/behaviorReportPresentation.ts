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

const isStable = (factor: BehaviorReportFactorViewModel): boolean => {
  if (factor.tScore !== null) return factor.tScore < 60;
  return /^(normal|none|typical|stable)$/i.test(factor.level?.code || factor.level?.severity || "");
};

const growthStatusLabel = (factor: BehaviorReportFactorViewModel): string => {
  if (factor.tScore !== null) {
    if (factor.tScore < 60) return "常模范围";
    if (factor.tScore < 65) return "可继续练习";
    if (factor.tScore < 70) return "建议重点练习";
    return "优先支持";
  }
  const level = `${factor.level?.severity || ""} ${factor.level?.code || ""}`.toLowerCase();
  if (/severe|critical|high/.test(level)) return "优先支持";
  if (/moderate|medium|elevated/.test(level)) return "建议重点练习";
  if (/mild|attention|watch|low/.test(level)) return "可继续练习";
  return "持续观察";
};

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
    statusLabel: growthStatusLabel(factor),
    scoreValue: factor.tScore ?? factor.rawScore,
    scoreKind: factor.tScore === null ? "raw_score" : "t_score",
  };
};

const summaryFor = (
  score: number | null,
  level: BehaviorReportLevelViewModel | null,
): { headline: string; hero: string } => {
  const key = `${level?.severity || ""} ${level?.code || ""}`.toLowerCase();
  const rank = score ?? (/severe|critical|high/.test(key) ? 75 : /moderate|medium|elevated/.test(key) ? 67 : /mild|attention|watch/.test(key) ? 62 : 50);
  if (rank >= 70) {
    return { headline: "建议优先提供支持", hero: "看见已有能力，也找到需要优先支持的方向" };
  }
  if (rank >= 60) {
    return { headline: "发现可继续练习的方向", hero: "看见优势，也发现可以继续练习的方向" };
  }
  return { headline: "整体表现处于常模范围", hero: "看见稳定表现，也保留持续成长的空间" };
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
  const stableFactors = leafFactors.filter((item) => isStable(item.factor));
  const attentionFactors = leafFactors.filter((item) => !isStable(item.factor));
  const totalTScore = totalFactor?.factor.tScore ?? null;
  const primaryTScore = report.primaryScore?.kind === "t_score" ? report.primaryScore.value : null;
  const summaryScore = totalTScore ?? report.primaryScore?.value ?? null;
  const summaryLevel = totalFactor?.factor.level || report.level;
  const summary = summaryFor(totalTScore ?? primaryTScore, summaryLevel);
  const stableCount = stableFactors.length;
  const attentionCount = attentionFactors.length;

  return {
    family,
    familyLabel: family === "brief2" ? "执行功能" : family === "spm" ? "感觉处理" : "行为能力",
    chartTitle: family === "brief2"
      ? "核心指数与同龄常模"
      : family === "spm" ? "感觉处理维度与同龄常模" : "因子得分与同龄常模",
    heroMessage: summary.hero,
    summaryScore,
    summaryScoreLabel: totalTScore !== null
      ? `${family === "brief2" ? "综合执行功能" : family === "spm" ? "感觉处理总分" : "综合"} T 分`
      : report.primaryScore?.label || (report.primaryScore?.kind === "t_score" ? "综合 T 分" : "综合得分"),
    summaryHeadline: summary.headline,
    chartFactors,
    portraitFactors: leafFactors.length ? leafFactors : presentations,
    chartCallout: attentionCount
      ? `${stableCount} 个维度处于常模范围，${attentionCount} 个维度建议结合日常情境重点观察`
      : "各维度整体处于常模范围，可继续保持稳定、清晰的日常支持",
  };
};
