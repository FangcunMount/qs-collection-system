import {
  CATALOG_LAYOUT,
  buildDeepExploreDisplayItems,
  partitionPersonalityCatalog,
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
});
