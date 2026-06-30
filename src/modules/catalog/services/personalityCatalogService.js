import {
  listPublishedPersonalityModels,
  getPublishedPersonalityModel,
  mapPublishedModelToCatalogItem,
} from '@/services/api/personality';
import { groupCatalogItems } from '@/modules/catalog/lib/mbtiVariants';
import { findCatalogItem } from '@/modules/catalog/lib/personalityCatalog';

const mapPublishedModelsToCatalog = (publishedModels = []) => {
  return publishedModels.map((model) => mapPublishedModelToCatalogItem(model.raw || model));
};

/**
 * 从 collection-server 加载已发布人格模型目录（唯一数据源）
 */
export async function loadGroupedPersonalityCatalog({
  page = 1,
  pageSize = 50,
  category = 'personality',
} = {}) {
  const result = await listPublishedPersonalityModels({ page, pageSize, category });
  const catalogItems = groupCatalogItems(mapPublishedModelsToCatalog(result.items || []));

  return {
    catalogItems,
    total: result.total ?? catalogItems.length,
    raw: result.raw,
  };
}

/**
 * 按 model_code 加载单个模型详情（详情页唯一数据源）
 */
export async function loadPersonalityModelDetail(modelCode) {
  if (!modelCode) {
    throw new Error('缺少 model_code');
  }

  const item = await getPublishedPersonalityModel(modelCode);
  return item;
}

export function resolveCatalogItemFromList(catalogItems, { key, modelCode } = {}) {
  return findCatalogItem(catalogItems, { key, modelCode });
}
