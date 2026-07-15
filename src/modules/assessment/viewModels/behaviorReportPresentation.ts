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
  meterSegments: number;
}

export interface BehaviorPracticePresentation {
  title: string;
  content: string;
  palette: BehaviorFactorPalette;
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
  strengthFactors: BehaviorFactorPresentation[];
  supportFactors: BehaviorFactorPresentation[];
  supportTitle: string;
  chartCallout: string;
  practices: BehaviorPracticePresentation[];
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

const concernRank = (factor: BehaviorReportFactorViewModel): number => {
  if (factor.tScore !== null) return factor.tScore;
  const level = `${factor.level?.severity || ""} ${factor.level?.code || ""}`.toLowerCase();
  if (/severe|critical|high/.test(level)) return 90;
  if (/moderate|medium|elevated/.test(level)) return 70;
  if (/mild|attention|watch|low/.test(level)) return 60;
  return 0;
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

const meterSegments = (factor: BehaviorReportFactorViewModel): number => {
  if (factor.tScore === null) return factor.rawScore === null ? 0 : 3;
  if (factor.tScore < 50) return 2;
  if (factor.tScore < 60) return 3;
  if (factor.tScore < 70) return 4;
  return 5;
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
    meterSegments: meterSegments(factor),
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

const guidanceFor = (factor: BehaviorReportFactorViewModel): string => {
  if (factor.suggestion) return factor.suggestion;
  const title = factor.title;
  const rules: Array<[RegExp, string]> = [
    [/任务启动|启动/, "把任务拆成清晰的第一步，并使用固定的开始提示。"],
    [/工作记忆|记忆/, "用清单、图片或关键词外化步骤，每次只保留少量信息。"],
    [/情景转换|灵活|转换/, "提前预告任务切换，使用倒计时和一致的过渡提示。"],
    [/抑制|冲动/, "通过规则游戏练习等待、停顿和轮流。"],
    [/情绪控制|情绪调节/, "帮助孩子为情绪命名，先暂停，再选择下一步行动。"],
    [/计划|组织|材料/, "把目标拆成可勾选的小步骤，并在完成后一起复盘。"],
    [/视觉/, "减少环境中的视觉杂乱，用清晰位置和图示突出关键信息。"],
    [/听觉/, "降低背景噪声，使用简短指令并确认孩子已经听到。"],
    [/触觉/, "尊重孩子对触感的选择，从可接受、可预测的体验逐步尝试。"],
    [/身体意识/, "在安全环境中安排推、拉、搬运等反馈明确的日常活动。"],
    [/运动与平衡|平衡/, "从稳定、可预期的动作开始，并关注安全与孩子的接受程度。"],
    [/社会参与|社交/, "先从熟悉的小组活动开始，明确轮流和互动规则。"],
  ];
  return rules.find(([pattern]) => pattern.test(title))?.[1] || "在日常情境中记录触发条件和有效支持方式，持续观察变化。";
};

const buildPractices = (
  report: BehaviorReportViewModel,
  candidates: BehaviorFactorPresentation[],
): BehaviorPracticePresentation[] => {
  const practices: BehaviorPracticePresentation[] = [];
  const seen = new Set<string>();
  const add = (title: string, content: string, palette: BehaviorFactorPalette) => {
    const normalized = content.trim();
    if (!normalized || seen.has(normalized) || practices.length >= 3) return;
    seen.add(normalized);
    practices.push({ title: title || "家庭练习", content: normalized, palette });
  };
  report.suggestions.forEach((suggestion, index) => {
    add(suggestion.category || "家庭练习", suggestion.content, PALETTES[index % PALETTES.length]);
  });
  candidates.forEach((item) => add(item.factor.title || "维度练习", guidanceFor(item.factor), item.palette));
  return practices;
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
  const attentionFactors = leafFactors.filter((item) => !isStable(item.factor) && concernRank(item.factor) > 0);
  const sortedAttention = [...attentionFactors].sort((a, b) => concernRank(b.factor) - concernRank(a.factor));
  const supportFactors = (sortedAttention.length
    ? sortedAttention
    : [...leafFactors].sort((a, b) => concernRank(b.factor) - concernRank(a.factor))).slice(0, 2);
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
    strengthFactors: [...stableFactors].sort((a, b) => concernRank(a.factor) - concernRank(b.factor)).slice(0, 2),
    supportFactors,
    supportTitle: sortedAttention.length ? "优先支持方向" : "持续成长方向",
    chartCallout: attentionCount
      ? `${stableCount} 个维度处于常模范围，${attentionCount} 个维度建议结合日常情境重点观察`
      : "各维度整体处于常模范围，可继续保持稳定、清晰的日常支持",
    practices: buildPractices(report, [...supportFactors, ...leafFactors]),
  };
};
