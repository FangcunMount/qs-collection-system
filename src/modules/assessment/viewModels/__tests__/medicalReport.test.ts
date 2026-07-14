import { buildMedicalReportViewModel, isPersonalityReportPayload } from "../medicalReport";

describe("medical report view model", () => {
  test("normalizes report identity, score, factors and suggestions", () => {
    expect(buildMedicalReportViewModel({
      scale_name: "儿童焦虑量表",
      scale_code: "SCARED",
      total_score: 18,
      conclusion: "需要关注",
      risk_level: "high",
      suggestions: [{ category: "家庭", content: "保持规律作息" }],
      dimensions: [{
        factor_code: "sleep",
        factor_name: "睡眠",
        raw_score: 5,
        max_score: 10,
        risk_level: "medium",
        suggestion: "记录睡眠",
      }],
    }, { id: "t1", legalName: "小明" })).toMatchObject({
      tone: "medical",
      scaleName: "儿童焦虑量表",
      scaleCode: "SCARED",
      testeeName: "小明",
      total: { score: 18, content: "需要关注" },
      factors: [{ factorCode: "sleep", score: 5, maxScore: 10 }],
      suggestions: [{ category: "家庭", content: "保持规律作息" }],
      hasContent: true,
    });
  });

  test("keeps personality payload dispatch compatible", () => {
    expect(isPersonalityReportPayload({ data: { model_extra: { type_code: "INTJ" } } })).toBe(true);
    expect(isPersonalityReportPayload({ scale_code: "SCARED" })).toBe(false);
  });
});
