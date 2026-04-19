import Taro from '@tarojs/taro';

import { errorHandler, isSessionExpiredCode } from '../util/authorization';
import { getAccessToken } from '../store/tokenStore';
import sessionManager from './auth/sessionManager';
import { getUrl } from '../util';
import config from '../config';

function summarizeRequestAuth(requestParams, options = {}) {
  return {
    url: requestParams.url,
    method: requestParams.method,
    needToken: requestParams.needToken,
    shouldHandleAuth: options.shouldHandleAuth ?? false,
    hasAuthorizationHeader: Boolean(requestParams.header?.Authorization),
    authRetryCount: options.authRetryCount ?? 0,
    qpsRetryCount: options.qpsRetryCount ?? 0
  };
}

function appendQueryParams(url, query = {}) {
  const pairs = [];

  Object.keys(query).forEach((key) => {
    const value = query[key];
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value
        .filter(item => item !== undefined && item !== null && item !== '')
        .forEach(item => {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      return;
    }

    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  if (pairs.length === 0) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${pairs.join('&')}`;
}

function getConfigToken() {
  const configToken = config.token;
  if (configToken !== undefined && configToken !== null) {
    console.info('[Load Token] 从 config 配置获取 token, 长度:', configToken.length);
    return configToken;
  }
  return null;
}

function loadToken() {
  const configToken = getConfigToken();
  if (configToken) {
    return configToken;
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    console.info('[Load Token] 从 TokenStore 获取到 access_token, 长度:', accessToken.length);
    return accessToken;
  }

  console.warn('[Load Token] ⚠️ 未找到 token');
  return null;
}

/**
 * 通用请求函数，自动处理 token 和错误
 * @param {string} url - API 路径
 * @param {object} params - 请求参数
 * @param {object} options - 请求选项
 * @param {string} options.host - 可选的自定义域名（如 config.iamHost, config.collectionHost）
 * @returns
 */
export async function request(url, params = {}, options = {}) {
  console.log('[Request] 请求 URL:', url, '参数:', params, '选项:', options);

  const requestParams = interceptorsRequest({
    ...options,
    url: appendQueryParams(getUrl(url, options.host), options.params),
    data: params
  });

  const configToken = getConfigToken();
  const shouldHandleAuth = requestParams.needToken && !configToken;
  console.info('[Request] 鉴权上下文', summarizeRequestAuth(requestParams, { shouldHandleAuth }));

  if (shouldHandleAuth) {
    try {
      const token = await sessionManager.ensureValidAccessToken({ allowInteractiveLogin: true });
      requestParams.header['Authorization'] = `Bearer ${token}`;
      console.info('[Request] 已注入可用 access token', {
        url: requestParams.url,
        tokenLength: token?.length ?? 0
      });
    } catch (error) {
      console.error('[Request] 获取可用 access_token 失败:', error);

      if (!error?.reason || (error.reason !== 'session_expired' && error.reason !== 'unregistered')) {
        Taro.showToast({
          title: String(error?.message ?? '请求失败'),
          icon: 'none'
        });
      }

      throw error;
    }
  } else {
    const token = loadToken();
    if (requestParams.needToken && token) {
      requestParams.header['Authorization'] = `Bearer ${token}`;
    }
  }

  return baseRequest(requestParams, {
    authRetryCount: 0,
    qpsRetryCount: 0,
    shouldHandleAuth
  });
}

const QPS_STATUS_CODE = 429;
const QPS_RETRY_LIMIT = 3;
const QPS_BACKOFF_BASE_MS = 800;

function extractResponseMeta(res) {
  const statusCode = res.statusCode ?? 0;
  const data = res.data || {};
  const code = String(data?.code ?? data?.errno ?? statusCode ?? '');
  const message = String(data?.message ?? data?.errmsg ?? '');
  const payload = data?.data !== undefined ? data.data : data;

  return { statusCode, data, code, message, payload };
}

function createRequestError(meta, extra = {}) {
  return {
    code: meta.code,
    message: meta.message,
    data: meta.payload,
    statusCode: meta.statusCode,
    ...extra
  };
}

async function retryWithFreshToken(params, context) {
  console.info('[BaseRequest] 开始强制刷新并重放请求', summarizeRequestAuth(params, context));
  const newToken = await sessionManager.refreshSession();
  params.header['Authorization'] = `Bearer ${newToken}`;
  console.info('[BaseRequest] 强制刷新成功，准备重放请求', {
    url: params.url,
    newTokenLength: newToken?.length ?? 0,
    nextAuthRetryCount: context.authRetryCount + 1
  });
  return baseRequest(params, {
    ...context,
    authRetryCount: context.authRetryCount + 1
  });
}

function baseRequest(params, context) {
  if (params.isNeedLoading) {
    Taro.showLoading({ title: params.loadingText });
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      ...params,
      complete: () => {
        if (params.isNeedLoading) {
          Taro.hideLoading();
        }
      },
      success: async (res) => {
        const meta = extractResponseMeta(res);

        console.log('[BaseRequest] 原始响应:', {
          statusCode: meta.statusCode,
          data: meta.data,
          dataType: typeof meta.data,
          hasDataField: 'data' in meta.data,
          dataKeys: Object.keys(meta.data)
        });

        if (meta.statusCode === QPS_STATUS_CODE) {
          if (context.qpsRetryCount >= QPS_RETRY_LIMIT) {
            const throttledMessage = meta.data?.message || meta.data?.errmsg || '请求过于频繁，请稍候再试';
            console.warn('[BaseRequest] 接口返回 429，重试次数已达上限', {
              url: params.url,
              qpsRetry: context.qpsRetryCount,
              limit: QPS_RETRY_LIMIT
            });
            if (!params.suppressErrorToast) {
              Taro.showToast({ title: throttledMessage, icon: 'none' });
            }
            reject({ code: '429', message: throttledMessage, statusCode: meta.statusCode, data: meta.data });
            return;
          }

          const nextAttempt = context.qpsRetryCount + 1;
          const delayMs = QPS_BACKOFF_BASE_MS * Math.pow(2, context.qpsRetryCount);
          console.warn('[BaseRequest] 接口返回 429，准备重试', {
            url: params.url,
            attempt: nextAttempt,
            delayMs,
            limit: QPS_RETRY_LIMIT
          });
          setTimeout(() => {
            baseRequest(params, {
              ...context,
              qpsRetryCount: nextAttempt
            }).then(resolve).catch(reject);
          }, delayMs);
          return;
        }

        if (context.shouldHandleAuth && isSessionExpiredCode(meta.code)) {
          console.warn('[BaseRequest] 收到会话失效响应，尝试强制刷新 token', {
            url: params.url,
            statusCode: meta.statusCode,
            code: meta.code,
            message: meta.message,
            authRetryCount: context.authRetryCount
          });

          if (context.authRetryCount >= 1) {
            console.error('[BaseRequest] Token 刷新后仍然鉴权失败，结束当前会话');
            sessionManager.clearSession('session_expired', { navigateHome: true });
            reject(createRequestError(meta, { needRelogin: true }));
            return;
          }

          try {
            const retryResult = await retryWithFreshToken(params, context);
            resolve(retryResult);
          } catch (error) {
            console.error('[BaseRequest] 强制刷新 token 失败:', {
              url: params.url,
              reason: error?.reason,
              code: error?.code,
              message: error?.message
            });
            sessionManager.clearSession(error?.reason || 'session_expired', { navigateHome: true });
            reject({
              ...createRequestError(meta, { needRelogin: true }),
              reason: error?.reason,
              error
            });
          }
          return;
        }

        const authVerifyResult = errorHandler.handleAuthError(meta.code);
        if (!authVerifyResult) {
          reject(createRequestError(meta));
          return;
        }

        if (meta.code && meta.code !== '0') {
          if (!params.suppressErrorToast) {
            Taro.showToast({ title: meta.message || '请求失败', icon: 'none' });
          }
          reject(createRequestError(meta));
          return;
        }

        resolve(meta.payload);
      },
      fail: (err) => {
        const message = err?.message ?? '请求失败';
        if (!params.suppressErrorToast) {
          Taro.showToast({ title: message, icon: 'none' });
        }
        reject({ code: '-1', message, error: err });
      }
    });
  });
}

function interceptorsRequest(options) {
  const defaultConfig = {
    url: '',
    data: {},
    header: {},
    method: 'GET',
    dataType: 'json',
    responseType: 'text',
    isNeedLoading: false,
    loadingText: '正在加载...',
    needToken: true,
    suppressErrorToast: false
  };

  const requestParam = {
    url: options.url ?? defaultConfig.url,
    data: options.data ?? defaultConfig.data,
    header: options.header ?? defaultConfig.header,
    method: options.method ?? defaultConfig.method,
    dataType: options.dataType ?? defaultConfig.dataType,
    responseType: options.responseType ?? defaultConfig.responseType,
    isNeedLoading: options.isNeedLoading ?? defaultConfig.isNeedLoading,
    loadingText: options.loadingText ?? defaultConfig.loadingText,
    needToken: options.needToken ?? defaultConfig.needToken,
    suppressErrorToast: options.suppressErrorToast ?? defaultConfig.suppressErrorToast
  };

  const token = loadToken();
  console.log('[InterceptorsRequest] 设置 token 到 header', {
    hasToken: !!token,
    token: token?.substring(0, 20) + '...',
    url: requestParam.url
  });
  if (token && requestParam.needToken) {
    requestParam.header['Authorization'] = `Bearer ${token}`;
  }
  requestParam.header['Frontend-Env'] = 'wx';
  requestParam.header['Wxshop-Id'] = config.wxshopid || '';

  return requestParam;
}
