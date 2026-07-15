import type { BehaviorReportFactorViewModel, BehaviorReportViewModel } from "../../types";
import { buildBehaviorReportPresentation } from "../behaviorReportPresentation";

const factor = (
  factorCode: string,
  title: string,
  tScore: number,
): BehaviorReportFactorViewModel => ({
  factorCode,
  title,
  description: `${title}说明`,
  suggestion: "",
  rawScore: tScore - 30,
  maxScore: null,
  derivedScores: [{ kind: "t_score", value: tScore, label: "", max: null }],
  tScore,
  percentile: null,
  standardScore: null,
  level: { code: tScore < 60 ? "normal" : tScore < 70 ? "mild" : "severe", label: "", severity: "" },
  normReference: {
    scoreKind: "t_score",
    benchmark: 50,
    tableVersion: "test-v1",
    formVariant: "parent",
    minAgeMonths: null,
    maxAgeMonths: null,
    gender: "",
  },
});

const report = (modelCode: string, modelName: string, factors: BehaviorReportFactorViewModel[]): BehaviorReportViewModel => ({
  tone: "ability",
  modelName,
  modelCode,
  createdAt: "2026-07-15",
  testeeName: "小树",
  testeeId: "t1",
  conclusion: "",
  primaryScore: { kind: "raw_score", value: 100, label: "", max: null },
  level: null,
  factors,
  suggestions: [],
  hasNormComparison: true,
  hasContent: true,
});

describe("behavior report presentation", () => {
  test("uses BRIEF-2 indexes for overview while keeping clinical scales in the portrait", () => {
    const presentation = buildBehaviorReportPresentation(report("gXkk9W", "BRIEF-2 家长版", [
      factor("p3O50jXO", "抑制", 58),
      factor("CI01dlwX", "工作记忆", 66),
      factor("CY73vuWV", "行为调节", 61),
      factor("93Ictrs1", "情绪调节", 64),
      factor("gBkIyKiq", "认知调节", 68),
      factor("XTwK5RCb", "总分", 67),
    ]));

    expect(presentation.family).toBe("brief2");
    expect(presentation.chartFactors.map((item) => item.factor.title)).toEqual([
      "行为调节", "情绪调节", "认知调节", "总分",
    ]);
    expect(presentation.portraitFactors.map((item) => item.factor.title)).toEqual(["抑制", "工作记忆"]);
    expect(presentation.portraitFactors.map((item) => item.statusLabel)).toEqual(["常模范围", "建议重点练习"]);
    expect(presentation.summaryScore).toBe(67);
  });

  test("uses SPM sensory dimensions and high T scores as support priorities", () => {
    const presentation = buildBehaviorReportPresentation(report("bJFKi3", "SPM 感觉统合量表", [
      factor("hwYAqCSd", "社会参与", 55),
      factor("TPRrr0hh", "视觉", 72),
      factor("JxzqkoP3", "听觉", 63),
      factor("DXnCfrnq", "总分", 69),
    ]));

    expect(presentation.family).toBe("spm");
    expect(presentation.chartFactors.map((item) => item.factor.title)).toEqual(["社会参与", "视觉", "听觉"]);
    expect(presentation.portraitFactors.map((item) => item.statusLabel)).toEqual([
      "常模范围", "优先支持", "可继续练习",
    ]);
    expect(presentation.summaryScore).toBe(69);
  });

  test("does not interpret a legacy raw total with T-score thresholds", () => {
    const legacy = report("legacy", "行为能力测评", []);
    legacy.primaryScore = { kind: "raw_score", value: 100, label: "总分", max: null };
    legacy.level = { code: "normal", label: "与同龄儿童相似", severity: "normal" };

    const presentation = buildBehaviorReportPresentation(legacy);

    expect(presentation.summaryScore).toBe(100);
    expect(presentation.summaryHeadline).toBe("整体表现处于常模范围");
  });
});
