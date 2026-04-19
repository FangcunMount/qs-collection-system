import { request } from '../servers';
import config from '../../config';
import { isSessionExpiredCode, isUnregisteredCode } from '../../util/authorization';

function maskIdentifier(value) {
  if (!value) return '';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function summarizeTokenPayload(payload) {
  return {
    hasAccessToken: Boolean(payload?.access_token),
    accessTokenLength: payload?.access_token?.length ?? 0,
    hasRefreshToken: Boolean(payload?.refresh_token),
    refreshTokenLength: payload?.refresh_token?.length ?? 0,
    tokenType: payload?.token_type ?? 'Bearer',
    expiresIn: payload?.expires_in ?? null
  };
}

function summarizeAuthError(error) {
  return {
    code: String(error?.code ?? error?.statusCode ?? error?.errno ?? ''),
    statusCode: error?.statusCode ?? null,
    message: error?.message ?? error?.errmsg ?? '认证请求失败',
    needRegister: Boolean(error?.needRegister),
    needRelogin: Boolean(error?.needRelogin)
  };
}

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
  const resolvedAppId = appId || config.appId;
  console.info('[IAM Authn] 发起登录请求', {
    method: 'wechat',
    audience: 'mobile',
    host: config.iamHost,
    appId: maskIdentifier(resolvedAppId),
    hasCode: Boolean(code),
    codeLength: code?.length ?? 0
  });

  try {
    const payload = await request('/authn/login', {
      // IAM authn 合同中小程序登录仍复用通用 wechat 方法值。
      method: 'wechat',
      credentials: {
        app_id: resolvedAppId,
        code
      },
      audience: 'mobile'
    }, {
      host: config.iamHost,
      method: 'POST',
      needToken: false
    });

    const result = createTokenResult(payload);
    if (result.ok) {
      console.info('[IAM Authn] 登录成功', summarizeTokenPayload(payload));
    } else {
      console.warn('[IAM Authn] 登录响应结构异常', {
        reason: result.reason,
        message: result.message,
        payloadKeys: Object.keys(payload || {})
      });
    }
    return result;
  } catch (error) {
    const normalized = normalizeAuthError(error, 'network_error');
    console.warn('[IAM Authn] 登录失败', {
      reason: normalized.reason,
      ...summarizeAuthError(error)
    });
    return normalized;
  }
};

/**
 * 刷新访问令牌
 * @param {string} refreshTokenValue - 刷新令牌
 * @returns {Promise<{ok: boolean, accessToken?: string, refreshToken?: string, tokenType?: string, expiresIn?: number, reason?: string, message?: string}>}
 */
export const refreshToken = async (refreshTokenValue) => {
  console.info('[IAM Authn] 发起刷新请求', {
    host: config.iamHost,
    hasRefreshToken: Boolean(refreshTokenValue),
    refreshTokenLength: refreshTokenValue?.length ?? 0
  });

  try {
    const payload = await request('/authn/refresh_token', {
      refresh_token: refreshTokenValue
    }, {
      host: config.iamHost,
      method: 'POST',
      needToken: false
    });

    const result = createTokenResult(payload);
    if (result.ok) {
      console.info('[IAM Authn] 刷新成功', summarizeTokenPayload(payload));
    } else {
      console.warn('[IAM Authn] 刷新响应结构异常', {
        reason: result.reason,
        message: result.message,
        payloadKeys: Object.keys(payload || {})
      });
    }
    return result;
  } catch (error) {
    const normalized = normalizeAuthError(error, 'session_expired');
    console.warn('[IAM Authn] 刷新失败', {
      reason: normalized.reason,
      ...summarizeAuthError(error)
    });
    return normalized;
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
