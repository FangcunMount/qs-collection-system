import Taro from '@tarojs/taro';
import { requestCancelled } from './requestLifetime';

import config from '@/config.js';
import { getUrl } from '@/shared/lib/url';
import { getAccessToken } from '@/shared/stores/session';
import { errorHandler, isSessionExpiredCode } from './auth/authorization';
import sessionManager from './auth/sessionManager';

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

function getConfigToken(quiet = false) {
  const configToken = config.token;
  if (configToken !== undefined && configToken !== null) {
    if (!quiet) console.info('[Load Token] 从 config 配置获取 token, 长度:', configToken.length);
    return configToken;
  }
  return null;
}

function loadToken(quiet = false) {
  const configToken = getConfigToken(quiet);
  if (configToken) {
    return configToken;
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    if (!quiet) console.info('[Load Token] 从 TokenStore 获取到 access_token, 长度:', accessToken.length);
    return accessToken;
  }

  if (!quiet) console.warn('[Load Token] ⚠️ 未找到 token');
  return null;
}

/**
 * 通用请求函数，自动处理 token 和错误
 * @param {string} url - API 路径
 * @param {object} params - 请求参数
 * @param {Record<string, any>} options - 请求选项（host 可选择 API 域名）
 * @returns
 */
export async function request(url, params = {}, options = {}) {
  const quiet = options.logPolicy === 'metadata_only';
  assertActive(options);
  if (!quiet) console.log('[Request] 请求 URL:', url, '参数:', params, '选项:', options);

  const requestParams = interceptorsRequest({
    ...options,
    url: appendQueryParams(getUrl(url, options.host), options.params),
    data: params
  });

  const configToken = getConfigToken(quiet);
  const shouldHandleAuth = requestParams.needToken && !configToken;
  if (!quiet) console.info('[Request] 鉴权上下文', summarizeRequestAuth(requestParams, { shouldHandleAuth }));

  if (shouldHandleAuth) {
    try {
      const token = await sessionManager.ensureValidAccessToken({ allowInteractiveLogin: options.allowInteractiveLogin ?? true });
      assertActive(requestParams);
      requestParams.header['Authorization'] = `Bearer ${token}`;
      if (!quiet) console.info('[Request] 已注入可用 access token', {
        url: requestParams.url,
        tokenLength: token?.length ?? 0
      });
    } catch (error) {
      if (!quiet) console.error('[Request] 获取可用 access_token 失败:', error);

      if (!options.suppressErrorToast && (!error?.reason || (error.reason !== 'session_expired' && error.reason !== 'unregistered'))) {
        Taro.showToast({
          title: String(error?.message ?? '请求失败'),
          icon: 'none'
        });
      }

      throw error;
    }
  } else {
    const token = loadToken(quiet);
    if (requestParams.needToken && token) {
      requestParams.header['Authorization'] = `Bearer ${token}`;
    }
  }

  assertActive(requestParams);
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
  const headers = res.header || res.headers || {};
  const isObjectPayload = data !== null && typeof data === 'object' && !Array.isArray(data);
  const hasBusinessCode = isObjectPayload && (data.code !== undefined || data.errno !== undefined);
  const code = hasBusinessCode ? String(data?.code ?? data?.errno ?? '') : '';
  const message = String(data?.message ?? data?.errmsg ?? '');
  const payload = hasBusinessCode && data?.data !== undefined ? data.data : data;

  return { statusCode, data, headers, code, message, payload, hasBusinessCode };
}

function readHeader(headers = {}, name) {
  const target = String(name).toLowerCase();
  const key = Object.keys(headers).find((candidate) => String(candidate).toLowerCase() === target);
  return key ? headers[key] : undefined;
}

function resolveRetryAfterMs(meta = {}, fallbackMs = 0) {
  const raw = readHeader(meta.headers, 'Retry-After');
  const headerValue = Number(raw);
  const headerDelayMs = Number.isFinite(headerValue) ? Math.max(0, headerValue * 1000) : Math.max(0, Date.parse(raw) - Date.now()) || 0;
  const payload = meta.payload && typeof meta.payload === 'object' ? meta.payload : {};
  const bodyDelayMs = Number(payload.retry_after_ms || payload.next_poll_after_ms || 0);
  return Math.max(headerDelayMs, Number.isFinite(bodyDelayMs) ? bodyDelayMs : 0, fallbackMs);
}

function createRequestError(meta, extra = {}) {
  return {
    code: meta.code || String(meta.statusCode || ''),
    message: meta.message,
    data: meta.payload,
    headers: meta.headers,
    retryAfterMs: resolveRetryAfterMs(meta),
    statusCode: meta.statusCode,
    ...extra
  };
}

function assertActive(params) {
  if (params.lifetime && !params.lifetime.isActive()) throw requestCancelled();
}

async function retryWithFreshToken(params, context) {
  assertActive(params);
  const quiet = params.logPolicy === 'metadata_only';
  if (!quiet) console.info('[BaseRequest] 开始强制刷新并重放请求', summarizeRequestAuth(params, context));
  const newToken = await sessionManager.refreshSession();
  assertActive(params);
  params.header['Authorization'] = `Bearer ${newToken}`;
  if (!quiet) console.info('[BaseRequest] 强制刷新成功，准备重放请求', {
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
  assertActive(params);
  const quiet = params.logPolicy === 'metadata_only';
  const startedAt = Date.now();
  if (params.isNeedLoading) {
    Taro.showLoading({ title: params.loadingText });
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let unsubscribe = () => {};
    let task;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      callback(value);
    };
    const resolve = value => finish(resolvePromise, value);
    const reject = error => finish(rejectPromise, error);
    const cancelled = () => {
      if (settled) return true;
      if (params.lifetime && !params.lifetime.isActive()) { reject(requestCancelled()); return true; }
      return false;
    };
    unsubscribe = params.lifetime?.onCancel(() => {
      reject(requestCancelled());
      task?.abort?.();
    }) || unsubscribe;
    if (cancelled()) return;
    task = Taro.request({
      ...params,
      complete: () => {
        if (params.isNeedLoading) {
          Taro.hideLoading();
        }
      },
      success: async (res) => {
        if (cancelled()) return;
        const meta = extractResponseMeta(res);

        if (quiet) console.info('[Request]', { method: params.method, statusCode: meta.statusCode, code: meta.code, elapsedMs: Date.now() - startedAt });
        if (!quiet) console.log('[BaseRequest] 原始响应:', {
          statusCode: meta.statusCode,
          data: meta.data,
          dataType: typeof meta.data,
          hasDataField: meta.data && typeof meta.data === 'object' && 'data' in meta.data,
          dataKeys: Object.keys(meta.data)
        });

        if (meta.statusCode === QPS_STATUS_CODE) {
          const retryAfterMs = resolveRetryAfterMs(meta);
          if (params.retry429 === false || context.qpsRetryCount >= QPS_RETRY_LIMIT) {
            const throttledMessage = meta.data?.message || meta.data?.errmsg || '请求过于频繁，请稍候再试';
            if (!quiet) console.warn('[BaseRequest] 接口返回 429，重试次数已达上限', {
              url: params.url,
              qpsRetry: context.qpsRetryCount,
              limit: QPS_RETRY_LIMIT
            });
            if (!params.suppressErrorToast) {
              Taro.showToast({ title: throttledMessage, icon: 'none' });
            }
            reject({
              code: '429',
              message: throttledMessage,
              statusCode: meta.statusCode,
              data: meta.payload,
              headers: meta.headers,
              retryAfterMs,
            });
            return;
          }

          const nextAttempt = context.qpsRetryCount + 1;
          const delayMs = Math.max(
            retryAfterMs,
            QPS_BACKOFF_BASE_MS * Math.pow(2, context.qpsRetryCount)
          );
          console.warn('[BaseRequest] 接口返回 429，准备重试', {
            url: params.url,
            attempt: nextAttempt,
            delayMs,
            limit: QPS_RETRY_LIMIT
          });
          setTimeout(() => {
            if (cancelled()) return;
            baseRequest(params, {
              ...context,
              qpsRetryCount: nextAttempt
            }).then(resolve).catch(reject);
          }, delayMs);
          return;
        }

        if (meta.statusCode >= 200 && meta.statusCode < 300 && !meta.hasBusinessCode) {
          resolve(meta.payload);
          return;
        }

        const authCode = meta.code || String(meta.statusCode || '');
        if (context.shouldHandleAuth && isSessionExpiredCode(authCode) && !(params.refreshOnForbidden === false && (meta.statusCode === 403 || authCode === '403'))) {
          if (!quiet) console.warn('[BaseRequest] 收到会话失效响应，尝试强制刷新 token', {
            url: params.url,
            statusCode: meta.statusCode,
            code: authCode,
            message: meta.message,
            authRetryCount: context.authRetryCount
          });

          if (context.authRetryCount >= 1) {
            if (!quiet) console.error('[BaseRequest] Token 刷新后仍然鉴权失败，结束当前会话');
            sessionManager.clearSession('session_expired', { navigateHome: true });
            reject(createRequestError(meta, { needRelogin: true }));
            return;
          }

          try {
            const retryResult = await retryWithFreshToken(params, context);
            resolve(retryResult);
          } catch (error) {
            if (cancelled()) return;
            if (error?.code === 'REQUEST_CANCELLED') { reject(error); return; }
            if (!quiet) console.error('[BaseRequest] 强制刷新 token 失败:', {
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

        const authVerifyResult = errorHandler.handleAuthError(authCode);
        if (!authVerifyResult) {
          reject(createRequestError(meta));
          return;
        }

        if (meta.hasBusinessCode && meta.code && meta.code !== '0') {
          if (!params.suppressErrorToast) {
            Taro.showToast({ title: meta.message || '请求失败', icon: 'none' });
          }
          reject(createRequestError(meta));
          return;
        }

        if (meta.statusCode < 200 || meta.statusCode >= 300) {
          if (!params.suppressErrorToast) {
            Taro.showToast({ title: meta.message || '请求失败', icon: 'none' });
          }
          reject(createRequestError(meta));
          return;
        }

        resolve(meta.payload);
      },
      fail: (err) => {
        if (cancelled()) return;
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
    header: { ...(options.header ?? defaultConfig.header) },
    method: options.method ?? defaultConfig.method,
    dataType: options.dataType ?? defaultConfig.dataType,
    responseType: options.responseType ?? defaultConfig.responseType,
    isNeedLoading: options.isNeedLoading ?? defaultConfig.isNeedLoading,
    loadingText: options.loadingText ?? defaultConfig.loadingText,
    needToken: options.needToken ?? defaultConfig.needToken,
    suppressErrorToast: options.suppressErrorToast ?? defaultConfig.suppressErrorToast,
    retry429: options.retry429 ?? true,
    refreshOnForbidden: options.refreshOnForbidden ?? true,
    logPolicy: options.logPolicy,
    lifetime: options.lifetime,
    timeout: options.timeout ?? 60000
  };

  const quiet = options.logPolicy === 'metadata_only';
  const token = loadToken(quiet);
  if (!quiet) console.log('[InterceptorsRequest] 设置 token 到 header', {
    hasToken: !!token,
    url: requestParam.url
  });
  if (token && requestParam.needToken) {
    requestParam.header['Authorization'] = `Bearer ${token}`;
  }
  requestParam.header['Frontend-Env'] = 'wx';
  requestParam.header['Wxshop-Id'] = config.wxshopid || '';

  return requestParam;
}
