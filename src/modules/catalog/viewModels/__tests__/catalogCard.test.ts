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
      durationLabel: "约 3 分钟",
      tone: "medical",
      disabled: false,
    });
    expect(source.scale_code).toBe(" GAD-7 ");
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
      title: "16 人格测评",
      durationMin: 12,
      hero: { kicker: "人格探索" },
    })).toMatchObject({
      key: "sixteen-types",
      modelCode: "personality-16",
      durationLabel: "约 12 分钟",
      tone: "personality",
      hero: { kicker: "人格探索" },
    });
  });

  it("uses stable duration fallbacks", () => {
    expect(formatCatalogDuration(0)).toBe("约 5 分钟");
    expect(formatCatalogDuration(60)).toBe("约 10 分钟");
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
});
