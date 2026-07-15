import { buildBehaviorReportViewModel } from "../behaviorReport";

describe("behavior report view model", () => {
  test("normalizes dedicated score, level and norm comparison fields", () => {
    expect(buildBehaviorReportViewModel({
      assessment_id: "a-42",
      model: { code: "BRIEF2_PARENT", title: "执行功能行为评定" },
      primary_score: { kind: "t_score", value: 63, label: "综合执行功能" },
      level: { code: "elevated", label: "建议关注", severity: "medium" },
      conclusion: "部分能力维度高于同龄常模中心位置。",
      dimensions: [{
        factor_code: "inhibit",
        factor_name: "抑制控制",
        raw_score: 18,
        max_score: 30,
        derived_scores: [
          { kind: "t_score", value: 65 },
          { kind: "percentile", value: 90 },
          { kind: "standard_score", value: 115 },
        ],
        level: { code: "elevated", label: "偏高", severity: "medium" },
        norm_reference: {
          score_kind: "t_score",
          benchmark: 50,
          table_version: "2026",
          form_variant: "parent",
          min_age_months: 60,
          max_age_months: 95,
          gender: "female",
        },
        description: "反映在需要时停止或调整行为的能力。",
        suggestion: "通过规则游戏练习等待和轮流。",
      }],
      suggestions: [{ category: "家庭练习", content: "从短时任务开始练习。" }],
    }, { id: "t-1", legalName: "小满" })).toMatchObject({
      tone: "ability",
      modelName: "执行功能行为评定",
      modelCode: "BRIEF2_PARENT",
      testeeName: "小满",
      primaryScore: { kind: "t_score", value: 63, label: "综合执行功能" },
      level: { code: "elevated", label: "建议关注" },
      factors: [{
        factorCode: "inhibit",
        rawScore: 18,
        tScore: 65,
        percentile: 90,
        standardScore: 115,
        normReference: {
          benchmark: 50,
          tableVersion: "2026",
          minAgeMonths: 60,
          maxAgeMonths: 95,
          gender: "female",
        },
      }],
      hasNormComparison: true,
      hasContent: true,
    });
  });

  test("keeps historical behavior reports readable without norm data", () => {
    const report = buildBehaviorReportViewModel({
      scale_name: "感觉统合能力测评",
      total_score: 20,
      risk_level: "normal",
      dimensions: [{ factor_code: "touch", factor_name: "触觉", raw_score: 8 }],
    });

    expect(report.primaryScore).toMatchObject({ kind: "raw_score", value: 20 });
    expect(report.level).toMatchObject({ code: "normal" });
    expect(report.factors[0]).toMatchObject({ tScore: null, normReference: null });
    expect(report.hasNormComparison).toBe(false);
  });
});
