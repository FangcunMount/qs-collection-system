import config from '../../config';
import { getWxApi } from '../../util/wxApi';
import { authorizationHandler } from '../../util/authorization';
import { getAccessToken, getRefreshToken, isTokenExpired, setToken, clearToken } from '../../store/tokenStore';
import * as iamAuthn from '../api/iamAuthnApi';

export const SESSION_STATUS = {
  ANONYMOUS: 'anonymous',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  REFRESHING: 'refreshing',
  UNREGISTERED: 'unregistered'
};

let sessionStatus = getAccessToken() ? SESSION_STATUS.AUTHENTICATED : SESSION_STATUS.ANONYMOUS;
let loginPromise = null;
let refreshPromise = null;
let isHomeRedirecting = false;
let isRegisterRedirecting = false;

function logSessionEvent(event, meta = {}) {
  console.info(`[SessionManager] ${event}`, meta);
}

function setSessionStatus(status) {
  if (sessionStatus !== status) {
    logSessionEvent('状态迁移', {
      from: sessionStatus,
      to: status
    });
  }
  sessionStatus = status;
}

function resetStatusIfNeeded(expectedStatus) {
  if (sessionStatus === expectedStatus) {
    setSessionStatus(getAccessToken() ? SESSION_STATUS.AUTHENTICATED : SESSION_STATUS.ANONYMOUS);
  }
}

function createSessionError(reason, message, extra = {}) {
  const error = new Error(message || reason);
  error.reason = reason;
  error.code = extra.code || reason;
  Object.assign(error, extra);
  return error;
}

function persistSession(tokenResult) {
  setToken({
    access_token: tokenResult.accessToken,
    refresh_token: tokenResult.refreshToken ?? null,
    token_type: tokenResult.tokenType ?? 'Bearer',
    expires_in: tokenResult.expiresIn
  });
  setSessionStatus(SESSION_STATUS.AUTHENTICATED);
  logSessionEvent('持久化会话成功', {
    accessTokenLength: tokenResult.accessToken?.length ?? 0,
    refreshTokenLength: tokenResult.refreshToken?.length ?? 0,
    expiresIn: tokenResult.expiresIn ?? null
  });
  return tokenResult.accessToken;
}

function clearInFlight() {
  loginPromise = null;
  refreshPromise = null;
}

async function getWechatLoginCode() {
  const wxApi = getWxApi();
  logSessionEvent('调用 wx.login 获取登录凭证');

  return new Promise((resolve, reject) => {
    wxApi.login({
      success(loginRes) {
        if (loginRes?.code) {
          logSessionEvent('wx.login 成功', {
            codeLength: loginRes.code.length
          });
          resolve(loginRes.code);
          return;
        }
        logSessionEvent('wx.login 未返回有效 code');
        reject(createSessionError('login_failed', '获取微信登录凭证失败'));
      },
      fail(error) {
        console.warn('[SessionManager] wx.login 调用失败', {
          message: error?.errMsg ?? '调用 wx.login 失败'
        });
        reject(createSessionError('network_error', error?.errMsg || '调用 wx.login 失败', { raw: error }));
      }
    });
  });
}

async function performLogin() {
  logSessionEvent('开始执行登录流程', {
    appId: config.appId
  });
  const code = await getWechatLoginCode();
  const result = await iamAuthn.login(code, config.appId);

  if (result.ok) {
    logSessionEvent('登录流程成功');
    return persistSession(result);
  }

  console.warn('[SessionManager] 登录流程失败', {
    reason: result.reason,
    code: result.code ?? '',
    message: result.message
  });
  if (result.reason === 'unregistered') {
    handleUnregisteredUser();
  }

  throw createSessionError(result.reason || 'login_failed', result.message || '登录失败', result);
}

async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw createSessionError('session_expired', '未找到 refresh token');
  }

  logSessionEvent('开始执行刷新流程', {
    refreshTokenLength: refreshToken.length
  });
  const result = await iamAuthn.refreshToken(refreshToken);

  if (result.ok) {
    logSessionEvent('刷新流程成功');
    return persistSession(result);
  }

  console.warn('[SessionManager] 刷新流程失败', {
    reason: result.reason,
    code: result.code ?? '',
    message: result.message
  });
  if (result.reason === 'unregistered') {
    handleUnregisteredUser();
  }

  throw createSessionError(result.reason || 'session_expired', result.message || '刷新 token 失败', result);
}

function navigateHomeSafely() {
  if (isHomeRedirecting) {
    return;
  }

  isHomeRedirecting = true;
  authorizationHandler.redirectToHome();
  setTimeout(() => {
    isHomeRedirecting = false;
  }, 300);
}

function navigateRegisterSafely() {
  if (isRegisterRedirecting) {
    return;
  }

  isRegisterRedirecting = true;
  authorizationHandler.redirectToRegister();
  setTimeout(() => {
    isRegisterRedirecting = false;
  }, 300);
}

export function getSessionStatus() {
  return sessionStatus;
}

export function clearSession(reason = 'manual', options = {}) {
  const { navigateHome = false } = options;
  logSessionEvent('清理会话', {
    reason,
    navigateHome
  });
  clearToken();
  clearInFlight();
  setSessionStatus(reason === 'unregistered' ? SESSION_STATUS.UNREGISTERED : SESSION_STATUS.ANONYMOUS);

  if (navigateHome) {
    navigateHomeSafely();
  }
}

export function handleUnregisteredUser() {
  logSessionEvent('识别到未注册用户，跳转注册页');
  clearSession('unregistered');
  navigateRegisterSafely();
  return { status: SESSION_STATUS.UNREGISTERED };
}

export function loginSession() {
  if (loginPromise) {
    logSessionEvent('复用进行中的登录 Promise');
    return loginPromise;
  }

  setSessionStatus(SESSION_STATUS.AUTHENTICATING);
  loginPromise = (async () => {
    try {
      return await performLogin();
    } finally {
      loginPromise = null;
      resetStatusIfNeeded(SESSION_STATUS.AUTHENTICATING);
    }
  })();

  return loginPromise;
}

export function refreshSession() {
  if (refreshPromise) {
    logSessionEvent('复用进行中的刷新 Promise');
    return refreshPromise;
  }

  setSessionStatus(SESSION_STATUS.REFRESHING);
  refreshPromise = (async () => {
    try {
      return await performRefresh();
    } finally {
      refreshPromise = null;
      resetStatusIfNeeded(SESSION_STATUS.REFRESHING);
    }
  })();

  return refreshPromise;
}

export async function bootstrapSession(options = {}) {
  const { allowInteractiveLogin = false } = options;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  logSessionEvent('启动会话引导', {
    allowInteractiveLogin,
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: accessToken?.length ?? 0,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken?.length ?? 0,
    accessTokenExpired: accessToken ? isTokenExpired() : null
  });

  if (accessToken && !isTokenExpired()) {
    setSessionStatus(SESSION_STATUS.AUTHENTICATED);
    logSessionEvent('启动命中有效 access token');
    return { status: SESSION_STATUS.AUTHENTICATED };
  }

  if (refreshToken) {
    try {
      await refreshSession();
      logSessionEvent('启动阶段通过 refresh token 恢复会话');
      return { status: SESSION_STATUS.AUTHENTICATED };
    } catch (error) {
      if (error?.reason === 'unregistered') {
        return { status: SESSION_STATUS.UNREGISTERED };
      }

      console.warn('[SessionManager] 启动阶段刷新失败', {
        reason: error?.reason,
        code: error?.code,
        message: error?.message
      });
      clearSession(error?.reason || 'session_expired', { navigateHome: true });
      return { status: SESSION_STATUS.ANONYMOUS };
    }
  }

  if (accessToken) {
    clearSession('session_expired', { navigateHome: true });
    return { status: SESSION_STATUS.ANONYMOUS };
  }

  if (!allowInteractiveLogin) {
    setSessionStatus(SESSION_STATUS.ANONYMOUS);
    logSessionEvent('启动阶段跳过交互登录，允许匿名浏览');
    return { status: SESSION_STATUS.ANONYMOUS };
  }

  try {
    await loginSession();
    logSessionEvent('启动阶段通过交互登录建立会话');
    return { status: SESSION_STATUS.AUTHENTICATED };
  } catch (error) {
    if (error?.reason === 'unregistered') {
      return { status: SESSION_STATUS.UNREGISTERED };
    }

    console.warn('[SessionManager] 启动阶段登录失败', {
      reason: error?.reason,
      code: error?.code,
      message: error?.message
    });
    clearSession(error?.reason || 'anonymous');
    return { status: SESSION_STATUS.ANONYMOUS };
  }
}

export async function ensureValidAccessToken(options = {}) {
  const { allowInteractiveLogin = true, forceRefresh = false } = options;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  logSessionEvent('校验 access token', {
    allowInteractiveLogin,
    forceRefresh,
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: accessToken?.length ?? 0,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken?.length ?? 0,
    accessTokenExpired: accessToken ? isTokenExpired() : null
  });

  if (!forceRefresh && accessToken && !isTokenExpired()) {
    setSessionStatus(SESSION_STATUS.AUTHENTICATED);
    logSessionEvent('复用当前 access token');
    return accessToken;
  }

  if (refreshToken && (forceRefresh || !accessToken || isTokenExpired())) {
    try {
      logSessionEvent('准备通过 refresh token 获取新的 access token', {
        forceRefresh
      });
      return await refreshSession();
    } catch (error) {
      if (error?.reason === 'unregistered') {
        throw error;
      }

      console.warn('[SessionManager] access token 校验时刷新失败', {
        reason: error?.reason,
        code: error?.code,
        message: error?.message
      });
      clearSession(error?.reason || 'session_expired', { navigateHome: true });
      throw error;
    }
  }

  if (accessToken && !refreshToken) {
    const expiredError = createSessionError('session_expired', '登录已过期，请重新进入小程序');
    clearSession(expiredError.reason, { navigateHome: true });
    throw expiredError;
  }

  if (allowInteractiveLogin) {
    return loginSession();
  }

  throw createSessionError('anonymous', '当前没有可用会话');
}

const sessionManager = {
  bootstrapSession,
  ensureValidAccessToken,
  clearSession,
  handleUnregisteredUser,
  loginSession,
  refreshSession,
  getSessionStatus
};

export default sessionManager;
