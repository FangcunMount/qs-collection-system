export const CATALOG_LAYOUT = Object.freeze({
  FEATURED: 'featured',
  SECONDARY: 'secondary',
  DEEP_EXPLORE_COMPACT: 'deep_explore_compact',
});

export const isDeepExploreCatalogItem = (item) => {
  if (!item) return false;
  return item.catalogLayout === CATALOG_LAYOUT.DEEP_EXPLORE_COMPACT;
};

export const isFeaturedCatalogItem = (item) => {
  if (!item) return false;
  return item.catalogLayout === CATALOG_LAYOUT.FEATURED || Boolean(item.isFeatured);
};

export const buildDeepExploreDisplayItems = (catalogItems = []) => {
  return catalogItems
    .filter(isDeepExploreCatalogItem)
    .map((item) => ({
      ...item,
      isPublished: Boolean(item.modelCode),
    }));
};

export const partitionPersonalityCatalog = (catalogItems = []) => {
  const featuredItem =
    catalogItems.find(isFeaturedCatalogItem) ||
    catalogItems.find((item) => Array.isArray(item.variants) && item.variants.length > 1) ||
    catalogItems[0] ||
    null;

  const featuredKey = featuredItem?.key;
  const featuredTitle = String(featuredItem?.title || '').trim().toLowerCase();
  const rest = catalogItems.filter((item) => {
    if (item.key === featuredKey) return false;
    // Grouped API payloads can still contain a family head and a variant with
    // different keys. Do not surface an identical featured title twice.
    const itemTitle = String(item?.title || '').trim().toLowerCase();
    return !featuredTitle || itemTitle !== featuredTitle;
  });

  return {
    featuredItem,
    deepExploreItems: rest.filter(isDeepExploreCatalogItem),
    secondaryItems: rest.filter((item) => !isDeepExploreCatalogItem(item)),
  };
};

export const selectPersonalityLandingItems = (catalogItems = []) => {
  const codeOf = (item) => String(item?.modelCode || item?.code || item?.raw?.code || '').toUpperCase();
  const isPublished = (item) => String(item?.raw?.status || item?.status || '').toLowerCase() === 'published';
  const findPublishedByCode = (pattern) => catalogItems.find((item) => (
    isPublished(item) && pattern.test(codeOf(item))
  )) || null;

  return {
    mbtiItem: findPublishedByCode(/^MBTI_/),
    sbtiItem: findPublishedByCode(/^SBTI_/),
    bigFiveItem: findPublishedByCode(/^BIG5_/),
    enneagramItem: findPublishedByCode(/^ENNEAGRAM_/),
  };
};

export const findCatalogItem = (catalogItems = [], { key, modelCode, familyCode } = {}) => {
  if (modelCode) {
    const matchedByCode = catalogItems.find((item) => item.modelCode === modelCode);
    if (matchedByCode) return matchedByCode;

    for (const groupedItem of catalogItems) {
      if (!Array.isArray(groupedItem.variants) || !groupedItem.variants.length) continue;
      const variant = groupedItem.variants.find((item) => item.modelCode === modelCode);
      if (variant) {
        return { ...groupedItem, ...variant, key: groupedItem.key };
      }
    }
  }

  if (familyCode) {
    return catalogItems.find((item) => item.familyCode === familyCode || item.key === familyCode) || null;
  }

  if (key) {
    return catalogItems.find((item) => item.key === String(key).toLowerCase()) || null;
  }

  return null;
};
