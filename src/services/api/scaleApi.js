import { request } from '../servers';
import config from '../../config';

/**
 * Collection 量表 API
 * 负责量表的查询和管理
 */

/**
 * 获取量表列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} status - 状态过滤（可选）
 * @param {string} title - 标题过滤（可选）
 * @param {string} category - 主类过滤（可选）
 * @param {string} stage - 阶段过滤（可选）
 * @param {string} applicableAge - 使用年龄过滤（可选）
 * @param {string} reporter - 填报人过滤（可选）
 * @param {string[]} tags - 标签过滤（可选，数组）
 * @returns {Promise<{scales: Array, total: number, page: number, page_size: number}>}
 */
export const getScales = (
  page = 1,
  pageSize = 20,
  status,
  title,
  category,
  stage,
  applicableAge,
  reporter,
  tags
) => {
  const queryParams = { page, page_size: pageSize };
  if (status) queryParams.status = status;
  if (title) queryParams.title = title;
  if (category) queryParams.category = category;
  if (stage) queryParams.stage = stage;
  if (applicableAge) queryParams.applicable_age = applicableAge;
  if (reporter) queryParams.reporter = reporter;
  if (tags && Array.isArray(tags) && tags.length > 0) {
    // 标签数组使用 CSV 格式
    queryParams.tags = tags.join(',');
  }
  
  // 构建查询字符串
  const queryString = Object.keys(queryParams)
    .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  
  return request(`/scales?${queryString}`, {}, {
    host: config.collectionHost,
    needToken: true
  });
};

/**
 * 获取量表分类列表
 * @returns {Promise<{categories: Array, stages: Array, applicable_ages: Array, reporters: Array, tags: Array}>}
 */
export const getScaleCategories = () => {
  return request('/scales/categories', {}, {
    host: config.collectionHost,
    needToken: true
  });
};

/**
 * 获取量表详情
 * @param {string} code - 量表编码
 * @returns {Promise<object>}
 */
export const getScale = (code) => {
  return request(`/scales/${code}`, {}, {
    host: config.collectionHost,
    needToken: true
  });
};

export default {
  getScales,
  getScaleCategories,
  getScale
};

