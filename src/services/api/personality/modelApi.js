import { request } from '../../servers';
import config from '../../../config';
import {
  unwrapResponse,
  normalizePersonalityModel,
  mapPublishedModelToCatalogItem,
} from './mappers';

const buildQueryString = (params = {}) => {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined && item !== null && item !== '')
        .forEach((item) => {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      return;
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return pairs.join('&');
};

/**
 * 获取已发布人格模型列表
 */
export async function listPublishedPersonalityModels({
  page = 1,
  pageSize = 20,
  category,
  keyword,
} = {}) {
  const params = {
    page,
    page_size: pageSize,
    category,
    keyword,
  };
  const queryString = buildQueryString(params);
  const url = queryString ? `/personality-models?${queryString}` : '/personality-models';

  const result = await request(url, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: false,
  });

  const payload = unwrapResponse(result) || {};
  const items = Array.isArray(payload.items)
    ? payload.items
    : (Array.isArray(payload) ? payload : []);

  return {
    items: items.map((item) => normalizePersonalityModel(item)),
    page: payload.page ?? page,
    pageSize: payload.page_size ?? pageSize,
    total: payload.total ?? items.length,
    raw: payload,
  };
}

/**
 * 获取单个已发布人格模型
 */
export async function getPublishedPersonalityModel(modelCode) {
  const encodedCode = encodeURIComponent(modelCode);
  const result = await request(`/personality-models/${encodedCode}`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: false,
  });

  const model = normalizePersonalityModel(unwrapResponse(result) || {});
  return mapPublishedModelToCatalogItem(model.raw);
}

/**
 * 获取人格模型分类
 */
export async function listPersonalityModelCategories() {
  const result = await request('/personality-models/categories', {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: false,
  });
  return unwrapResponse(result) || [];
}
