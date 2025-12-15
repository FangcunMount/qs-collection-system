import { request } from '../servers';
import config from '../../config';

/**
 * IAM 身份管理 API (identity.v1)
 * 负责用户信息、儿童档案、监护关系管理
 */

/**
 * 生成幂等性密钥
 * @returns {string}
 */
function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 获取当前用户信息
 * @returns {Promise<object>} 用户信息
 */
export const getMe = () => {
  return request('/identity/me', {}, {
    host: config.iamHost,
    needToken: true
  });
};

/**
 * 更新当前用户信息
 * @param {object} userData - 用户数据
 * @returns {Promise<object>} 更新后的用户信息
 */
export const updateMe = (userData) => {
  return request('/identity/me', userData, {
    host: config.iamHost,
    method: 'PATCH',
    needToken: true
  });
};

/**
 * 获取当前用户的儿童档案列表
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number, offset: number, limit: number}>}
 */
export const getMyChildren = (offset = 0, limit = 20) => {
  return request('/identity/me/children', {}, {
    host: config.iamHost,
    params: { offset, limit },
    needToken: true
  });
};

/**
 * 注册孩子（建档 + 授当前用户为监护人）
 * @param {object} childData - 儿童数据
 * @param {string} childData.legalName - 法定姓名（必填，camelCase）
 * @param {string} childData.dob - 出生日期 (YYYY-MM-DD)（必填）
 * @param {number} childData.gender - 性别 (1=男, 2=女)（必填）
 * @param {string} childData.relation - 关系类型（必填，用于注册接口）
 * @param {string} childData.idType - 证件类型（可选）
 * @param {string} childData.idNo - 证件号码（可选）
 * @param {number} childData.heightCm - 身高（可选，int 类型）
 * @param {string} childData.weightKg - 体重（可选，string 类型）
 * @returns {Promise<{child: object, guardianship: object}>} 
 * @description 响应格式已更新为嵌套格式: {code, message, data: {child, guardianship}}
 * 但 request() 会自动提取 data.data，返回 {child, guardianship}
 */
export const registerChild = (childData) => {
  return request('/identity/children/register', childData, {
    host: config.iamHost,
    method: 'POST',
    needToken: true,
    header: {
      'X-Idempotency-Key': generateIdempotencyKey()
    }
  });
};

/**
 * 搜索儿童
 * @param {string} name - 姓名
 * @param {string} dob - 出生日期 (YYYY-MM-DD)
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number}>}
 */
export const searchChildren = (name, dob, offset = 0, limit = 20) => {
  const params = { offset, limit };
  if (name) params.name = name;
  if (dob) params.dob = dob;
  
  return request('/identity/children/search', {}, {
    host: config.iamHost,
    params,
    needToken: true
  });
};

/**
 * 获取儿童详情
 * @param {string} childId - 儿童ID
 * @returns {Promise<object>}
 */
export const getChild = (childId) => {
  return request(`/identity/children/${String(childId)}`, {}, {
    host: config.iamHost,
    needToken: true
  });
};

/**
 * 更新儿童信息
 * @param {string} childId - 儿童ID
 * @param {object} childData - 儿童数据
 * @returns {Promise<object>}
 */
export const updateChild = (childId, childData) => {
  return request(`/identity/children/${String(childId)}`, childData, {
    host: config.iamHost,
    method: 'PATCH',
    needToken: true
  });
};

/**
 * 删除儿童档案
 * @param {string} childId - 儿童ID
 * @returns {Promise<{message: string}>}
 */
export const deleteChild = (childId) => {
  return request(`/identity/children/${String(childId)}`, {}, {
    host: config.iamHost,
    method: 'DELETE',
    needToken: true
  });
};

/**
 * 获取儿童的监护人列表
 * @param {string} childId - 儿童ID
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number}>}
 */
export const getChildGuardians = (childId, offset = 0, limit = 20) => {
  return request(`/identity/children/${String(childId)}/guardians`, {}, {
    host: config.iamHost,
    params: { offset, limit },
    needToken: true
  });
};

/**
 * 添加监护人
 * @param {string} childId - 儿童ID
 * @param {string} userId - 用户ID
 * @param {string} relation - 关系类型
 * @returns {Promise<object>}
 */
export const addGuardian = (childId, userId, relation = 'parent') => {
  return request(`/identity/guardianships`, {
    child_id: childId,
    user_id: userId,
    relation
  }, {
    host: config.iamHost,
    method: 'POST',
    needToken: true,
    header: {
      'X-Idempotency-Key': generateIdempotencyKey()
    }
  });
};

/**
 * 移除监护关系
 * @param {string} guardianshipId - 监护关系ID
 * @returns {Promise<{message: string}>}
 */
export const removeGuardian = (guardianshipId) => {
  return request(`/identity/guardianships/${guardianshipId}`, {}, {
    host: config.iamHost,
    method: 'DELETE',
    needToken: true
  });
};

export default {
  getMe,
  updateMe,
  getMyChildren,
  registerChild,
  searchChildren,
  getChild,
  updateChild,
  deleteChild,
  getChildGuardians,
  addGuardian,
  removeGuardian
};
