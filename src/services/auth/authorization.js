import { routes } from "@/shared/config/routes";
import { getWxApi } from "@/shared/platform/weapp/wxApi";
import { clearSession } from "@/shared/stores/session";

const authErrorMap = {
  "1001": "权限验证失败，请重新进入小程序",
  "1002": "未找到小程序用户",
  "100207": "用户未注册",
  "102001": "用户未注册",
  "102404": "用户未注册"
};

export const HOME_PAGE_URL = routes.tabHome();
export const REGISTER_PAGE_URL = routes.accountRegister();

const SESSION_EXPIRED_CODES = new Set(["401", "403"]);
const UNREGISTERED_CODES = new Set(["100207", "102001", "102404"]);

function toCode(value) {
  return String(value ?? "");
}

function buildUrl(baseUrl, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function isSessionExpiredCode(code) {
  return SESSION_EXPIRED_CODES.has(toCode(code));
}

export function isUnregisteredCode(code) {
  return UNREGISTERED_CODES.has(toCode(code));
}

class AuthorizationHandler {
  logout(errmsg) {
    clearSession();

    const wxApi = getWxApi();
    wxApi.reLaunch({
      url: routes.systemError({ text: errmsg })
    });
  }

  redirectToRegister(params = {}) {
    const wxApi = getWxApi();
    wxApi.reLaunch({
      url: buildUrl(REGISTER_PAGE_URL, params)
    });
  }

  redirectToHome() {
    const wxApi = getWxApi();
    wxApi.reLaunch({ url: HOME_PAGE_URL });
  }
}

class ErrorHandler {
  handleAuthError(code) {
    const normalizedCode = toCode(code);

    if (!normalizedCode || isSessionExpiredCode(normalizedCode)) {
      return true;
    }

    if (isUnregisteredCode(normalizedCode)) {
      authorizationHandler.redirectToRegister();
      return false;
    }

    if (Object.prototype.hasOwnProperty.call(authErrorMap, normalizedCode)) {
      authorizationHandler.logout(authErrorMap[normalizedCode]);
      return false;
    }

    return true;
  }
}

export const initConfig = () => {};
export const authorizationHandler = new AuthorizationHandler();
export const errorHandler = new ErrorHandler();

export default {
  HOME_PAGE_URL,
  REGISTER_PAGE_URL,
  initConfig,
  authorizationHandler,
  errorHandler,
  isSessionExpiredCode,
  isUnregisteredCode,
};
