import { request } from '../servers';
import config from '../../config';

/**
 * Collection 问卷 API
 * 负责问卷的查询
 */

/**
 * 获取问卷列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} status - 状态过滤（draft/published/archived，可选）
 * @param {string} title - 标题过滤（可选）
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export const getQuestionnaires = (page = 1, pageSize = 20, status, title) => {
  const queryParams = { page, page_size: pageSize };
  if (status) queryParams.status = status;
  if (title) queryParams.title = title;
  
  // 构建查询字符串
  const queryString = Object.keys(queryParams)
    .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  
  return request(`/questionnaires?${queryString}`, {}, {
    host: config.collectionHost,
    needToken: true
  });
};

/**
 * 获取问卷详情
 * @param {string} code - 问卷编码
 * @returns {Promise<object>}
 */
export const getQuestionnaire = (code) => {
  return request(`/questionnaires/${code}`, {}, {
    host: config.collectionHost,
    needToken: true
  });
};

export default {
  getQuestionnaires,
  getQuestionnaire
};
