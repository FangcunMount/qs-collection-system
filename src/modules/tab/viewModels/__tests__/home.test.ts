import { formatHomeDateTime, mapRecentAssessment, resolveHomeRiskTone } from "../home";

describe("home view models", () => {
  it("normalizes a readable recent assessment", () => {
    expect(mapRecentAssessment({
      id: "assessment-1",
      answer_sheet_id: "sheet-1",
      scale_name: "GAD-7",
      total_score: "12.4",
      risk_level: "moderate",
      testee_id: "testee-1",
    }, 0, ["report.png"])).toMatchObject({
      id: "assessment-1",
      answerSheetId: "sheet-1",
      title: "GAD-7",
      score: 12.4,
      riskTone: "medium",
      riskLabel: "中风险",
      icon: "report.png",
      testeeId: "testee-1",
    });
  });

  it("uses stable fallbacks for incomplete values", () => {
    expect(mapRecentAssessment(null, 0, [])).toBeNull();
    expect(formatHomeDateTime("")).toBe("时间待同步");
    expect(resolveHomeRiskTone("critical")).toBe("high");
    expect(mapRecentAssessment({ id: "missing" }, 0, [])).toMatchObject({
      score: "", riskTone: "unknown", riskLabel: "查看报告", tag: "",
    });
    expect(resolveHomeRiskTone("not_high")).toBe("unknown");
  });

  it("does not show the answer-sheet title when a questionnaire title is available", () => {
    expect(mapRecentAssessment({
      id: "assessment-2",
      title: "3adyDE",
      questionnaire_code: "SNAP-IV",
    }, 0, [])).toMatchObject({
      title: "SNAP-IV",
    });
  });
});
