import { request } from '../servers';
import config from '../../config';

/**
 * Collection 受试者 API
 * 负责受试者（testee）的创建、查询、更新
 */

/**
 * 检查受试者是否存在
 * @param {string|number} iamChildId - IAM儿童ID
 * @returns {Promise<{exists: boolean, testee_id?: number}>}
 */
export const checkTesteeExists = (iamChildId) => {
  return request('/testees/exists', {}, {
    host: config.collectionHost,
    params: { iam_child_id: String(iamChildId) },
    needToken: true
  });
};

/**
 * 获取我的受试者列表
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number, offset: number, limit: number}>}
 */
export const getMyTestees = (offset = 0, limit = 20) => {
  return request('/testees', {}, {
    host: config.collectionHost,
    params: { offset, limit },
    needToken: true
  });
};

/**
 * 创建受试者
 * @param {object} testeeData - 受试者数据
 * @param {string|number} testeeData.iam_user_id - IAM用户ID（可选，支持大数，建议用字符串）
 * @param {string|number} testeeData.iam_child_id - IAM儿童ID（必填，支持大数，建议用字符串）
 * @param {string} testeeData.name - 姓名（必填）
 * @param {number} testeeData.gender - 性别 (1=男, 2=女, 3=其他)（必填）
 * @param {string} testeeData.birthday - 出生日期 (YYYY-MM-DD)（可选）
 * @param {string[]} testeeData.tags - 标签列表（可选）
 * @param {string} testeeData.source - 来源（可选）
 * @param {boolean} testeeData.is_key_focus - 是否重点关注（可选）
 * @returns {Promise<object>}
 */
export const createTestee = (testeeData) => {
  return request('/testees', testeeData, {
    host: config.collectionHost,
    method: 'POST',
    needToken: true
  });
};

/**
 * 获取受试者详情
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<object>}
 */
export const getTestee = (testeeId) => {
  return request(`/testees/${String(testeeId)}`, {}, {
    host: config.collectionHost,
    needToken: true
  });
};

/**
 * 更新受试者信息
 * @param {string|number} testeeId - 受试者ID
 * @param {object} testeeData - 受试者数据
 * @returns {Promise<object>}
 */
export const updateTestee = (testeeId, testeeData) => {
  return request(`/testees/${String(testeeId)}`, testeeData, {
    host: config.collectionHost,
    method: 'PUT',
    needToken: true
  });
};

/**
 * 删除受试者
 * @param {string|number} testeeId - 受试者ID
 * @returns {Promise<{message: string}>}
 */
export const deleteTestee = (testeeId) => {
  return request(`/testees/${String(testeeId)}`, {}, {
    host: config.collectionHost,
    method: 'DELETE',
    needToken: true
  });
};

export default {
  checkTesteeExists,
  getMyTestees,
  createTestee,
  getTestee,
  updateTestee,
  deleteTestee
};
