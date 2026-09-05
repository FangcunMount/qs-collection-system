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


  test.each([null, undefined, "", "  ", false, "invalid"])("does not invent a score from %s or discard a standalone conclusion", (total_score) => {
    const result = buildMedicalReportViewModel({ total_score, conclusion: "本次结论" });
    expect(result.total).toBeNull();
    expect(result.conclusion).toBe("本次结论");
    expect(result.hasContent).toBe(true);
  });

  test("keeps personality payload dispatch compatible", () => {
    expect(isPersonalityReportPayload({ data: { model_extra: { type_code: "INTJ" } } })).toBe(true);
    expect(isPersonalityReportPayload({ scale_code: "SCARED" })).toBe(false);
  });
});

test("does not borrow a different member's name for a historical report", () => {
  expect(buildMedicalReportViewModel({ testee_id: "report-member" }, { id: "selected-member", legalName: "另一个成员" })).toMatchObject({ testeeId: "report-member", testeeName: "" });
  expect(buildMedicalReportViewModel({ testee_id: "report-member" }, { id: "report-member", legalName: "报告成员" })).toMatchObject({ testeeId: "report-member", testeeName: "报告成员" });
});
