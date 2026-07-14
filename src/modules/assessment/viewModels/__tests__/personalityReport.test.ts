import { buildPersonalityReportViewModel } from "../personalityReport";

describe("personality report view model", () => {
  test("keeps personality identity and optional sections independent from medical reports", () => {
    expect(buildPersonalityReportViewModel({
      data: {
        model_name: "MBTI 人格类型",
        model_code: "MBTI",
        created_at: "2026-07-14T10:00:00Z",
        model_extra: { type_code: "INTJ", type_name: "建筑师" },
        conclusion: "善于独立思考",
        dimensions: [{
          factor_code: "EI",
          factor_name: "能量倾向",
          raw_score: 7,
          max_score: 10,
        }],
        report_sections: [{ key: "strength", title: "优势", content: "系统思考" }],
        suggestions: [{ title: "协作", text: "主动同步思路" }],
      },
    }, { id: "testee-1", legalName: "小明" })).toMatchObject({
      tone: "personality",
      modelTitle: "MBTI 人格类型",
      modelCode: "MBTI",
      testeeName: "小明",
      testeeId: "testee-1",
      outcome: { code: "INTJ", title: "建筑师" },
      hero: { conclusion: "善于独立思考" },
      dimensions: [{ factor_code: "EI", score: 7, max_score: 10 }],
      sections: [{ key: "strength", title: "优势", content: "系统思考" }],
      suggestions: [{ category: "协作", content: "主动同步思路" }],
      hasContent: true,
    });
  });

  test("handles reports without optional content", () => {
    expect(buildPersonalityReportViewModel({ model_code: "EMPTY" })).toMatchObject({
      tone: "personality",
      modelCode: "EMPTY",
      dimensions: [],
      sections: [],
      suggestions: [],
      hasContent: false,
    });
  });
});
