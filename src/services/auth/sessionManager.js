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

function setSessionStatus(status) {
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
  return tokenResult.accessToken;
}

function clearInFlight() {
  loginPromise = null;
  refreshPromise = null;
}

async function getWechatLoginCode() {
  const wxApi = getWxApi();

  return new Promise((resolve, reject) => {
    wxApi.login({
      success(loginRes) {
        if (loginRes?.code) {
          resolve(loginRes.code);
          return;
        }
        reject(createSessionError('login_failed', '获取微信登录凭证失败'));
      },
      fail(error) {
        reject(createSessionError('network_error', error?.errMsg || '调用 wx.login 失败', { raw: error }));
      }
    });
  });
}

async function performLogin() {
  const code = await getWechatLoginCode();
  const result = await iamAuthn.login(code, config.appId);

  if (result.ok) {
    return persistSession(result);
  }

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

  const result = await iamAuthn.refreshToken(refreshToken);

  if (result.ok) {
    return persistSession(result);
  }

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
  clearToken();
  clearInFlight();
  setSessionStatus(reason === 'unregistered' ? SESSION_STATUS.UNREGISTERED : SESSION_STATUS.ANONYMOUS);

  if (navigateHome) {
    navigateHomeSafely();
  }
}

export function handleUnregisteredUser() {
  clearSession('unregistered');
  navigateRegisterSafely();
  return { status: SESSION_STATUS.UNREGISTERED };
}

export function loginSession() {
  if (loginPromise) {
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

export async function bootstrapSession() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (accessToken && !isTokenExpired()) {
    setSessionStatus(SESSION_STATUS.AUTHENTICATED);
    return { status: SESSION_STATUS.AUTHENTICATED };
  }

  if (refreshToken) {
    try {
      await refreshSession();
      return { status: SESSION_STATUS.AUTHENTICATED };
    } catch (error) {
      if (error?.reason === 'unregistered') {
        return { status: SESSION_STATUS.UNREGISTERED };
      }

      clearSession(error?.reason || 'session_expired', { navigateHome: true });
      return { status: SESSION_STATUS.ANONYMOUS };
    }
  }

  if (accessToken) {
    clearSession('session_expired', { navigateHome: true });
    return { status: SESSION_STATUS.ANONYMOUS };
  }

  try {
    await loginSession();
    return { status: SESSION_STATUS.AUTHENTICATED };
  } catch (error) {
    if (error?.reason === 'unregistered') {
      return { status: SESSION_STATUS.UNREGISTERED };
    }

    clearSession(error?.reason || 'anonymous');
    return { status: SESSION_STATUS.ANONYMOUS };
  }
}

export async function ensureValidAccessToken(options = {}) {
  const { allowInteractiveLogin = true, forceRefresh = false } = options;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!forceRefresh && accessToken && !isTokenExpired()) {
    setSessionStatus(SESSION_STATUS.AUTHENTICATED);
    return accessToken;
  }

  if (refreshToken && (forceRefresh || !accessToken || isTokenExpired())) {
    try {
      return await refreshSession();
    } catch (error) {
      if (error?.reason === 'unregistered') {
        throw error;
      }

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
