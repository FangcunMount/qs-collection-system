import {
  CATALOG_LAYOUT,
  buildDeepExploreDisplayItems,
  partitionPersonalityCatalog,
  selectPersonalityLandingItems,
} from "../personalityCatalog";

describe("personality catalog layout", () => {
  test("featured deep-explore family is not rendered again as a compact card", () => {
    const items = [
      { key: "family", title: "深度探索测评", catalogLayout: CATALOG_LAYOUT.FEATURED, modelCode: "family" },
      { key: "variant", title: "深度探索测评", catalogLayout: CATALOG_LAYOUT.DEEP_EXPLORE_COMPACT, modelCode: "variant" },
      { key: "fun", title: "趣味人格", catalogLayout: CATALOG_LAYOUT.SECONDARY, modelCode: "fun" },
    ];

    const partitioned = partitionPersonalityCatalog(items);
    const compact = buildDeepExploreDisplayItems(partitioned.deepExploreItems);

    expect(partitioned.featuredItem.key).toBe("family");
    expect(partitioned.secondaryItems.map((item) => item.key)).toEqual(["fun"]);
    expect(compact).toEqual([]);
  });

  test("selects landing entries from published model codes when algorithms are shared", () => {
    const items = [
      { key: "mbti", modelCode: "MBTI_PRIMARY", raw: { status: "published", algorithm: "personality_typology" } },
      { key: "fun", modelCode: "SBTI_FUN", raw: { status: "published", algorithm: "personality_typology" } },
      { key: "ocean", modelCode: "BIG5_50", raw: { status: "published", algorithm: "personality_typology" } },
      { key: "enneagram", modelCode: "ENNEAGRAM_45", raw: { status: "published", algorithm: "personality_typology" } },
      { key: "draft", modelCode: "SBTI_DRAFT", raw: { status: "draft" } },
    ];

    expect(selectPersonalityLandingItems(items)).toEqual({
      mbtiItem: items[0],
      sbtiItem: items[1],
      bigFiveItem: items[2],
      enneagramItem: items[3],
    });
  });
});
