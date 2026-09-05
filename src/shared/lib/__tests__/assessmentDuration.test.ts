import { estimateAssessmentMinutes, formatAssessmentDuration } from "../assessmentDuration";
import { mapMedicalCatalogCard } from "@/modules/catalog/viewModels/catalogCard";
import { getEstimatedTime } from "@/modules/questionnaire/lib/questionUtils";

describe("assessment duration across catalog and preparation", () => {
  const questions = Array.from({ length: 18 }, (_, index) => ({ code: String(index), type: "Radio" }));

  test("uses the same estimate and excludes section headings", () => {
    const catalog = mapMedicalCatalogCard({ question_count: 18 });
    const minutes = getEstimatedTime({ questions: [{ type: "Section" }, ...questions] });
    expect(minutes).toBe(9);
    expect(catalog.durationLabel).toBe(`约 ${minutes} 分钟`);
  });

  test("published minutes override the estimate on both pages", () => {
    expect(mapMedicalCatalogCard({ question_count: 18, estimated_time: 4.5 }).durationLabel).toBe("约 5 分钟");
    expect(getEstimatedTime({ estimated_time: 4.5, questions })).toBe(5);
  });

  test("does not invent a duration without evidence", () => {
    expect(formatAssessmentDuration(0)).toBe("用时待确认");
    expect(estimateAssessmentMinutes(NaN)).toBeNull();
    expect(estimateAssessmentMinutes(-1, Infinity)).toBeNull();
    expect(estimateAssessmentMinutes(18, 0, 0)).toBeNull();
  });
});
