import {
  formatCatalogDuration,
  mapAbilityCatalogCard,
  mapMedicalCatalogCard,
  mapPersonalityCatalogCard,
  matchesCatalogCardSearch,
} from "../catalogCard";

describe("catalog card view models", () => {
  it("normalizes legacy medical model fields without changing the source", () => {
    const source = {
      scale_code: " GAD-7 ",
      scale_name: "焦虑筛查",
      description: "近期焦虑体验",
      category: { value: "emt" },
      tags: [{ label: "情绪" }, "焦虑"],
      question_count: 7,
    };

    const card = mapMedicalCatalogCard(source);

    expect(card).toMatchObject({
      code: "GAD-7",
      title: "焦虑筛查",
      category: "emt",
      tags: ["情绪", "焦虑"],
      questionCount: 7,
      durationLabel: "约 4 分钟",
      tone: "medical",
      disabled: false,
    });
    expect(source.scale_code).toBe(" GAD-7 ");
  });

  it("shows only provided suitability facts and rejects explicit unpublished status", () => {
    expect(mapMedicalCatalogCard({ code: "one", reporters: ["parent", "teacher"], applicable_ages: ["school_child", "school_child"], status: "published" })).toMatchObject({
      reporterLabel: "家长、教师", audienceLabel: "学龄儿童", statusLabel: "已发布", disabled: false,
    });
    expect(mapMedicalCatalogCard({ code: "draft", status: "draft" }).disabled).toBe(true);
    expect(mapMedicalCatalogCard({ code: "unknown" })).toMatchObject({ reporterLabel: "", audienceLabel: "", description: "" });
  });

  it("keeps keyword search local and includes tags", () => {
    const card = mapMedicalCatalogCard({ code: "SDS", title: "抑郁自评", tags: ["情绪低落"] });
    expect(matchesCatalogCardSearch(card, "低落")).toBe(true);
    expect(matchesCatalogCardSearch(card, "睡眠")).toBe(false);
  });

  it("normalizes personality presentation fields independently", () => {
    expect(mapPersonalityCatalogCard({
      key: "sixteen-types",
      modelCode: "personality-16",
      algorithm: "mbti",
      title: "16 人格测评",
      durationMin: 12,
      hero: { kicker: "人格探索" },
    })).toMatchObject({
      key: "sixteen-types",
      modelCode: "personality-16",
      algorithm: "mbti",
      durationLabel: "约 12 分钟",
      tone: "personality",
      hero: { kicker: "人格探索" },
    });
  });

  it("estimates from known question counts and keeps missing durations unknown", () => {
    expect(formatCatalogDuration(0)).toBe("用时待确认");
    expect(formatCatalogDuration(60)).toBe("约 30 分钟");
  });

  it("keeps unavailable ability assessments disabled", () => {
    expect(mapAbilityCatalogCard({
      key: "executive",
      title: "执行功能评估",
      status: "planned",
      scaleCode: null,
      duration: "约 10 分钟",
    })).toMatchObject({
      key: "executive",
      disabled: true,
      durationLabel: "约 10 分钟",
      tone: "ability",
    });
  });

  it("maps published ability models from the generic assessment catalogue", () => {
    expect(mapAbilityCatalogCard({
      code: "EXECUTIVE_FUNCTION_36",
      questionnaire_code: "EXECUTIVE_FUNCTION_36",
      title: "执行功能评估",
      description: "了解日常计划与调节表现。",
      kind: "ability",
      status: "published",
      question_count: 36,
    })).toMatchObject({
      code: "EXECUTIVE_FUNCTION_36",
      modelCode: "EXECUTIVE_FUNCTION_36",
      questionCount: 36,
      durationLabel: "约 18 分钟",
      iconKey: "executive",
      testedLabel: "已发布",
      disabled: false,
      tone: "ability",
    });
  });
});
