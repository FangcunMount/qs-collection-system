import { getWxApi } from './wxApi';
import { clearToken } from '../store/tokenStore';

const authErrorMap = {
  '1001': '权限验证失败，请重新进入小程序',
  '1002': '未找到小程序用户',
  '100207': '用户未注册',
  '102001': '用户未注册',
  '102404': '用户未注册'
};

export const HOME_PAGE_URL = '/pages/home/index/index';
export const REGISTER_PAGE_URL = '/pages/user/register/index';

const SESSION_EXPIRED_CODES = new Set(['401', '403']);
const UNREGISTERED_CODES = new Set(['100207', '102001', '102404']);

function toCode(value) {
  return String(value ?? '');
}

export function isSessionExpiredCode(code) {
  return SESSION_EXPIRED_CODES.has(toCode(code));
}

export function isUnregisteredCode(code) {
  return UNREGISTERED_CODES.has(toCode(code));
}

function buildUrl(baseUrl, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

class AuthorizationHandler {
  logout(errmsg) {
    try {
      clearToken();

      const wxApi = getWxApi();
      wxApi.reLaunch({
        url: `/pages/system/error/errpage?text=${encodeURIComponent(errmsg)}`
      });
    } catch (error) {
      console.error('logout 失败:', error);
      throw error;
    }
  }

  redirectToRegister(params = {}) {
    try {
      const wxApi = getWxApi();
      const url = buildUrl(REGISTER_PAGE_URL, params);
      console.log('[Auth] 跳转到注册页面:', url);
      wxApi.reLaunch({ url });
    } catch (error) {
      console.error('跳转注册页面失败:', error);
      throw error;
    }
  }

  redirectToHome() {
    try {
      const wxApi = getWxApi();
      console.log('[Auth] 跳转到首页重建会话:', HOME_PAGE_URL);
      wxApi.reLaunch({ url: HOME_PAGE_URL });
    } catch (error) {
      console.error('跳转首页失败:', error);
      throw error;
    }
  }
}

class ErrorHandler {
  handleAuthError(code) {
    const key = toCode(code);

    if (!key || isSessionExpiredCode(key)) {
      return true;
    }

    if (isUnregisteredCode(key)) {
      authorizationHandler.redirectToRegister();
      return false;
    }

    if (authErrorMap.hasOwnProperty(key)) {
      authorizationHandler.logout(authErrorMap[key]);
      return false;
    }

    return true;
  }
}

export const initConfig = () => {};

export const authorizationHandler = new AuthorizationHandler();
export const errorHandler = new ErrorHandler();
