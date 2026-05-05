import { request } from '../servers';
import config from '../../config';

/**
 * IAM 身份管理 API (identity.v2)
 * 负责用户信息、档案、档案关系管理
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
 * 获取当前用户的档案列表
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number, offset: number, limit: number}>}
 */
export const getMyProfiles = (offset = 0, limit = 20) => {
  return request('/identity/me/profiles', {}, {
    host: config.iamHost,
    params: { offset, limit },
    needToken: true
  });
};

/**
 * 创建档案（建档 + 授当前用户档案关系）
 * @param {object} profileData - 档案数据
 * @returns {Promise<{profile: object, profileLink: object}>}
 */
export const createProfile = (profileData) => {
  return request('/identity/profiles', profileData, {
    host: config.iamHost,
    method: 'POST',
    needToken: true,
    header: {
      'X-Idempotency-Key': generateIdempotencyKey()
    }
  });
};

/**
 * 搜索档案
 * @param {string} name - 姓名
 * @param {string} dob - 出生日期 (YYYY-MM-DD)
 * @param {number} offset - 偏移量
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: Array, total: number}>}
 */
export const searchProfiles = (name, dob, offset = 0, limit = 20) => {
  const params = { offset, limit };
  if (name) params.name = name;
  if (dob) params.dob = dob;
  
  return request('/identity/profiles/search', {}, {
    host: config.iamHost,
    params,
    needToken: true
  });
};

/**
 * 获取档案详情
 * @param {string} profileId - 档案ID
 * @returns {Promise<object>}
 */
export const getProfile = (profileId) => {
  return request(`/identity/profiles/${String(profileId)}`, {}, {
    host: config.iamHost,
    needToken: true
  });
};

/**
 * 更新档案信息
 * @param {string} profileId - 档案ID
 * @param {object} profileData - 档案数据
 * @returns {Promise<object>}
 */
export const updateProfile = (profileId, profileData) => {
  return request(`/identity/profiles/${String(profileId)}`, profileData, {
    host: config.iamHost,
    method: 'PATCH',
    needToken: true
  });
};

/**
 * 查询档案关系
 * @param {object} query - 查询条件。推荐使用 includeRevoked；active 仅保留为旧入参兼容。
 * @returns {Promise<{items: Array, total: number}>}
 */
function normalizeBoolean(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
}

function resolveIncludeRevoked({ includeRevoked, include_revoked, active } = {}) {
  if (includeRevoked !== undefined) return normalizeBoolean(includeRevoked);
  if (include_revoked !== undefined) return normalizeBoolean(include_revoked);
  if (active !== undefined) return !normalizeBoolean(active);
  return undefined;
}

export const listProfileLinks = ({
  userId,
  profileId,
  includeRevoked,
  include_revoked,
  active,
  offset = 0,
  limit = 20
} = {}) => {
  const params = { offset, limit };
  if (userId) params.user_id = String(userId);
  if (profileId) params.profile_id = String(profileId);
  const resolvedIncludeRevoked = resolveIncludeRevoked({ includeRevoked, include_revoked, active });
  if (resolvedIncludeRevoked !== undefined) params.include_revoked = resolvedIncludeRevoked;

  return request('/identity/profile-links', {}, {
    host: config.iamHost,
    params,
    needToken: true
  });
};

/**
 * 授予档案关系
 * @param {object} data - 关系数据
 * @returns {Promise<object>}
 */
export const createProfileLink = ({ profileId, userId, relation = 'parent' }) => {
  return request('/identity/profile-links', {
    profileId: String(profileId),
    userId: userId ? String(userId) : undefined,
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
 * 撤销档案关系
 * @param {string} profileLinkId - 档案关系ID
 * @returns {Promise<{message: string}>}
 */
export const revokeProfileLink = (profileLinkId) => {
  return request(`/identity/profile-links/${String(profileLinkId)}/revoke`, {}, {
    host: config.iamHost,
    method: 'POST',
    needToken: true
  });
};

/**
 * 兼容旧调用名：删除当前用户与档案的关系，不删除档案本身。
 * @param {string} profileId - 档案ID
 * @returns {Promise<{message: string}>}
 */
export const deleteChild = async (profileId) => {
  const links = await listProfileLinks({ profileId, includeRevoked: false, offset: 0, limit: 20 });
  const link = (links?.items || []).find(item => String(item.profileId || item.profile_id) === String(profileId));
  if (!link?.id) {
    throw new Error('未找到可撤销的档案关系');
  }
  return revokeProfileLink(link.id);
};

export const getMyChildren = getMyProfiles;
export const registerChild = createProfile;
export const searchChildren = searchProfiles;
export const getChild = getProfile;
export const updateChild = updateProfile;

/**
 * 兼容旧调用名：获取档案关系列表。
 */
export const getChildGuardians = (profileId, offset = 0, limit = 20) => {
  return listProfileLinks({ profileId, offset, limit });
};

/**
 * 兼容旧调用名：添加档案关系。
 */
export const addGuardian = (profileId, userId, relation = 'parent') => {
  return createProfileLink({
    profileId,
    userId,
    relation
  });
};

/**
 * 兼容旧调用名：撤销档案关系。
 */
export const removeGuardian = (profileLinkId) => {
  return revokeProfileLink(profileLinkId);
};

export default {
  getMe,
  updateMe,
  getMyProfiles,
  createProfile,
  searchProfiles,
  getProfile,
  updateProfile,
  listProfileLinks,
  createProfileLink,
  revokeProfileLink,
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
