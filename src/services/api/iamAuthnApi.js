import { request } from '../servers';
import config from '../../config';
import { isSessionExpiredCode, isUnregisteredCode } from '../../util/authorization';

function createTokenResult(payload) {
  if (!payload?.access_token) {
    return {
      ok: false,
      reason: 'invalid_response',
      message: '认证响应中未返回有效 token',
      raw: payload
    };
  }

  return {
    ok: true,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    tokenType: payload.token_type ?? 'Bearer',
    expiresIn: payload.expires_in,
    raw: payload
  };
}

function normalizeAuthError(error, fallbackReason = 'network_error') {
  const code = String(error?.code ?? error?.statusCode ?? error?.errno ?? '');
  const message = error?.message ?? error?.errmsg ?? '认证请求失败';

  if (error?.needRegister || isUnregisteredCode(code)) {
    return { ok: false, reason: 'unregistered', code, message, raw: error };
  }

  if (error?.needRelogin || isSessionExpiredCode(code) || error?.statusCode === 401 || error?.statusCode === 403) {
    return { ok: false, reason: 'session_expired', code, message, raw: error };
  }

  if (code === '-1') {
    return { ok: false, reason: 'network_error', code, message, raw: error };
  }

  return { ok: false, reason: fallbackReason, code, message, raw: error };
}

/**
 * 用户登录（微信小程序）
 * @param {string} code - 微信登录凭证
 * @param {string} appId - 微信小程序 AppID
 * @returns {Promise<{ok: boolean, accessToken?: string, refreshToken?: string, tokenType?: string, expiresIn?: number, reason?: string, message?: string}>}
 */
export const login = async (code, appId) => {
  try {
    const payload = await request('/authn/login', {
      method: 'wechat_miniprogram',
      credentials: {
        app_id: appId || config.appId,
        code
      },
      audience: 'mobile'
    }, {
      host: config.iamHost,
      method: 'POST',
      needToken: false
    });

    return createTokenResult(payload);
  } catch (error) {
    return normalizeAuthError(error, 'network_error');
  }
};

/**
 * 刷新访问令牌
 * @param {string} refreshTokenValue - 刷新令牌
 * @returns {Promise<{ok: boolean, accessToken?: string, refreshToken?: string, tokenType?: string, expiresIn?: number, reason?: string, message?: string}>}
 */
export const refreshToken = async (refreshTokenValue) => {
  try {
    const payload = await request('/authn/refresh_token', {
      refresh_token: refreshTokenValue
    }, {
      host: config.iamHost,
      method: 'POST',
      needToken: false
    });

    return createTokenResult(payload);
  } catch (error) {
    return normalizeAuthError(error, 'session_expired');
  }
};

/**
 * 用户登出
 * @param {string} accessToken - 访问令牌
 * @param {string} refreshTokenValue - 刷新令牌（可选）
 * @returns {Promise<{ok: boolean, raw?: any, message?: string}>}
 */
export const logout = async (accessToken, refreshTokenValue) => {
  const data = { access_token: accessToken };
  if (refreshTokenValue) {
    data.refresh_token = refreshTokenValue;
  }

  try {
    const payload = await request('/authn/logout', data, {
      host: config.iamHost,
      method: 'POST',
      needToken: false,
      header: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    });
    return { ok: true, raw: payload };
  } catch (error) {
    return { ok: false, message: error?.message ?? '登出失败', raw: error };
  }
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
