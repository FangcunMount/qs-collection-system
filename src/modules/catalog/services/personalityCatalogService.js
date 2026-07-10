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

const findPublishedModelByCode = (publishedModels = [], modelCode) => {
  const code = String(modelCode || '').trim();
  if (!code) return null;
  return publishedModels.find((item) => item.code === code) || null;
};

/**
 * 从 collection-server 加载已发布人格模型目录（唯一数据源）
 */
export async function loadGroupedPersonalityCatalog({
  page = 1,
  pageSize = 50,
  category = 'personality',
} = {}) {
  const result = await listPublishedPersonalityModels({ page, pageSize });
  const catalogItems = groupCatalogItems(mapPublishedModelsToCatalog(result.items || []));

  return {
    catalogItems,
    total: result.total ?? catalogItems.length,
    raw: result.raw,
    publishedModels: result.items || [],
  };
}

/**
 * 详情页展示：优先用公开列表数据，避免未鉴权访问 /typology-models/:code
 */
export async function loadPersonalityModelDetail(modelCode, { publishedModels } = {}) {
  if (!modelCode) {
    throw new Error('缺少 model_code');
  }

  let models = publishedModels;
  if (!Array.isArray(models)) {
    const result = await listPublishedPersonalityModels({ page: 1, pageSize: 50 });
    models = result.items || [];
  }

  const matched = findPublishedModelByCode(models, modelCode);
  if (matched) {
    return mapPublishedModelToCatalogItem(matched.raw || matched);
  }

  return getPublishedPersonalityModel(modelCode);
}

export function resolveCatalogItemFromList(catalogItems, { key, modelCode } = {}) {
  return findCatalogItem(catalogItems, { key, modelCode });
}

export function resolvePublishedModelCatalogItem(publishedModels = [], modelCode) {
  const matched = findPublishedModelByCode(publishedModels, modelCode);
  if (!matched) return null;
  return mapPublishedModelToCatalogItem(matched.raw || matched);
}
