import { request } from '../servers';
import config from '../../config';

/**
 * IAM 认证 API (authn.v1)
 * 负责用户登录、令牌管理、账户管理
 */

/**
 * 用户登录（微信小程序）
 * @param {string} code - 微信登录凭证
 * @param {string} appId - 微信小程序 AppID
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string, expires_in: number}>}
 */
export const login = (code, appId) => {
  return request('/authn/login', {
    method: 'wechat_miniprogram',
    credentials: {
      app_id: appId || config.appId,
      code: code
    },
    audience: 'mobile'
  }, {
    host: config.iamHost,
    method: 'POST',
    needToken: false
  });
};

/**
 * 刷新访问令牌
 * @param {string} refreshTokenValue - 刷新令牌
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string, expires_in: number}>}
 */
export const refreshToken = (refreshTokenValue) => {
  return request('/authn/refresh_token', {
    refresh_token: refreshTokenValue
  }, {
    host: config.iamHost,
    method: 'POST',
    needToken: false
  });
};

/**
 * 用户登出
 * @param {string} accessToken - 访问令牌
 * @param {string} refreshTokenValue - 刷新令牌（可选）
 * @returns {Promise<{message: string}>}
 */
export const logout = (accessToken, refreshTokenValue) => {
  const data = { access_token: accessToken };
  if (refreshTokenValue) {
    data.refresh_token = refreshTokenValue;
  }
  
  return request('/authn/logout', data, {
    host: config.iamHost,
    method: 'POST',
    needToken: true
  });
};

/**
 * 验证访问令牌
 * @param {string} token - 访问令牌
 * @returns {Promise<{valid: boolean, claims: object}>}
 */
export const verifyToken = (token) => {
  return request('/authn/verify', {
    token
  }, {
    host: config.iamHost,
    method: 'POST',
    needToken: false
  });
};

/**
 * 微信用户注册
 * @param {string} code - 微信 JS Code
 * @param {string} appId - 微信小程序 AppID
 * @param {object} profile - 用户资料（可选）
 * @returns {Promise<{account_id: string, user_id: string}>}
 */
export const registerWechatAccount = (code, appId, profile = {}) => {
  return request('/authn/accounts/wechat/register', {
    app_id: appId || config.appId,
    code,
    profile
  }, {
    host: config.iamHost,
    method: 'POST',
    needToken: false
  });
};

/**
 * 获取账户信息
 * @param {string} accountId - 账户ID
 * @returns {Promise<object>}
 */
export const getAccount = (accountId) => {
  return request(`/authn/accounts/${accountId}`, {}, {
    host: config.iamHost,
    needToken: true
  });
};

/**
 * 更新账户资料
 * @param {string} accountId - 账户ID
 * @param {object} profile - 资料数据
 * @returns {Promise<{message: string}>}
 */
export const updateAccountProfile = (accountId, profile) => {
  return request(`/authn/accounts/${accountId}/profile`, profile, {
    host: config.iamHost,
    method: 'PUT',
    needToken: true
  });
};

/**
 * 设置账户 UnionID
 * @param {string} accountId - 账户ID
 * @param {string} unionId - UnionID
 * @returns {Promise<{message: string}>}
 */
export const setAccountUnionId = (accountId, unionId) => {
  return request(`/authn/accounts/${accountId}/unionid`, {
    union_id: unionId
  }, {
    host: config.iamHost,
    method: 'PUT',
    needToken: true
  });
};

export default {
  login,
  refreshToken,
  logout,
  verifyToken,
  registerWechatAccount,
  getAccount,
  updateAccountProfile,
  setAccountUnionId
};
