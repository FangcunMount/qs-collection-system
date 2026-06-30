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
  const rest = catalogItems.filter((item) => item.key !== featuredKey);

  return {
    featuredItem,
    deepExploreItems: rest.filter(isDeepExploreCatalogItem),
    secondaryItems: rest.filter((item) => !isDeepExploreCatalogItem(item)),
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
