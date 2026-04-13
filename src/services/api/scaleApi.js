import { request } from '../servers';
import config from '../../config';

/**
 * Collection 量表 API
 * 负责量表的查询和管理
 */

const buildQueryString = (params = {}) => {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value
        .filter(item => item !== undefined && item !== null && item !== '')
        .forEach(item => {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      return;
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return pairs.join('&');
};

/**
 * 获取量表列表
 * @param {object} options
 * @returns {Promise<{scales: Array, total: number, page: number, page_size: number}>}
 */
export const getScales = ({
  page = 1,
  pageSize = 20,
  status,
  title,
  category,
  stages = [],
  applicableAges = [],
  reporters = [],
  tags = []
} = {}) => {
  const queryString = buildQueryString({
    page,
    page_size: pageSize,
    status,
    title,
    category,
    stages,
    applicable_ages: applicableAges,
    reporters,
    tags
  });

  return request(queryString ? `/scales?${queryString}` : '/scales', {}, {
    host: config.collectionHost,
    needToken: false
  });
};

/**
 * 获取量表分类列表
 * @returns {Promise<{categories: Array, stages: Array, applicable_ages: Array, reporters: Array, tags: Array}>}
 */
export const getScaleCategories = () => {
  return request('/scales/categories', {}, {
    host: config.collectionHost,
    needToken: false
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
