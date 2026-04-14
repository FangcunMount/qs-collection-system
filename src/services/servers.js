import Taro from '@tarojs/taro'

import { authorizationHandler, errorHandler } from '../util/authorization'
import { 
  getAccessToken, 
  getRefreshingState, 
  setRefreshingState,
  isTokenExpired 
} from '../store/tokenStore'
import { getUrl } from '../util'
import config from '../config'

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

/**
 * 通用请求函数，自动处理 token 和错误
 * @param {string} url - API 路径
 * @param {object} params - 请求参数
 * @param {object} options - 请求选项
 * @param {string} options.host - 可选的自定义域名（如 config.iamHost, config.collectionHost）
 * @returns 
 */
export async function request(url, params = {}, options = {}) {
  console.log("[Request] 请求 URL:", url, "参数:", params, "选项:", options);
  
  // 请求前检查 token 是否即将过期
  if (options.needToken !== false) { // 默认需要 token
    const tokenBefore = loadToken();
    if (tokenBefore && isTokenExpired()) {
      console.log('[Request] Token 即将过期，先刷新再请求', {
        tokenBefore: tokenBefore?.substring(0, 20) + '...'
      });
      try {
        const newToken = await ensureTokenRefreshed();
        const tokenAfter = loadToken();
        console.log('[Request] Token 刷新完成', {
          newToken: newToken?.substring(0, 20) + '...',
          tokenAfter: tokenAfter?.substring(0, 20) + '...',
          isSame: newToken === tokenAfter
        });
      } catch (error) {
        console.error('[Request] Token 刷新失败:', error);
        // 刷新失败继续执行，让后续逻辑处理
      }
    }
  }
  
  const requestParams = interceptorsRequest({
    ...options,
    url: appendQueryParams(getUrl(url, options.host), options.params),
    data: params
  })

  // 加载 token，优先使用环境变量中的 token，其次使用全局数据中的 token
  const token = loadToken()
  console.log("........[Request] 请求参数:", requestParams);
  console.log("........[Request] Token 状态:", { hasToken: !!token, tokenLength: token?.length, needToken: requestParams.needToken });

  if (requestParams.needToken && !token) {
    console.log('[Request] 未找到 token，开始自动登录...');
    return new Promise((resolve, reject) => {
      authorizationHandler.login({appId: config.appId}).then((res) => {
        console.log('[Request] 自动登录成功，access_token:', res?.substring(0, 20) + '...');
        
        // 验证 token 是否已保存
        const verifyToken = loadToken();
        console.log('[Request] 登录后验证 token:', { saved: !!verifyToken, length: verifyToken?.length });
        
        requestParams.header['Authorization'] = `Bearer ${res}`;
        
        baseRequest(requestParams)
          .then((result) => {
            resolve(result)
          }).catch((err) => {
            reject(err)
          });
      }).catch((err) => {
        console.error('[Request] 自动登录失败:', err);
        Taro.showToast({ title: String(err?.errmsg ?? err?.message ?? '请求失败'), icon: 'none' })
        reject(err);
      });
    })
  }

  return baseRequest(requestParams)
}

/**
 * 确保 token 已刷新（带防并发保护）
 */
async function ensureTokenRefreshed() {
  const { isRefreshing, refreshPromise } = getRefreshingState();
  
  // 如果正在刷新，等待完成
  if (isRefreshing && refreshPromise) {
    console.log('[Request] 等待其他请求完成 token 刷新');
    return refreshPromise;
  }
  
  // 开始刷新
  const newRefreshPromise = authorizationHandler.refreshToken();
  setRefreshingState(true, newRefreshPromise);
  
  try {
    const newToken = await newRefreshPromise;
    setRefreshingState(false, null);
    return newToken;
  } catch (error) {
    setRefreshingState(false, null);
    throw error;
  }
}

function loadToken() {
  console.log("[Load Token] 开始加载 token");
  
  // 1. 优先从 config 获取
  const configToken = config.token 
  if (configToken != undefined && configToken !== null) {
    console.info("[Load Token] 从 config 配置获取 token, 长度:", configToken.length);
    return configToken
  }

  // 2. 从 tokenStore 获取
  const accessToken = getAccessToken();
  if (accessToken) {
    console.info("[Load Token] 从 TokenStore 获取到 access_token, 长度:", accessToken.length);
    return accessToken;
  }

  console.warn("[Load Token] ⚠️ 未找到 token");
  return null;
}

const QPS_STATUS_CODE = 429;
const QPS_RETRY_LIMIT = 3;
const QPS_BACKOFF_BASE_MS = 800;

function baseRequest(params, retryCount = 0, qpsRetry = 0) {
  if (params.isNeedLoading) {
    Taro.showLoading({ title: params.loadingText });
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      ...params,
      complete: () => { params.isNeedLoading && Taro.hideLoading() },
      success: (res) => {
        const statusCode = res.statusCode ?? 0;
        const data = res.data || {};
        
        console.log('[BaseRequest] 原始响应:', {
          statusCode: statusCode,
          data: data,
          dataType: typeof data,
          hasDataField: 'data' in data,
          dataKeys: Object.keys(data)
        });

        if (statusCode === QPS_STATUS_CODE) {
          if (qpsRetry >= QPS_RETRY_LIMIT) {
            const throttledMessage = data?.message || data?.errmsg || '请求过于频繁，请稍候再试';
            console.warn('[BaseRequest] 接口返回 429，重试次数已达上限', {
              url: params.url,
              qpsRetry,
              limit: QPS_RETRY_LIMIT
            });
            Taro.showToast({ title: throttledMessage, icon: 'none' });
            reject({ code: '429', message: throttledMessage, statusCode, data });
            return;
          }

          const nextAttempt = qpsRetry + 1;
          const delayMs = QPS_BACKOFF_BASE_MS * Math.pow(2, qpsRetry);
          console.warn('[BaseRequest] 接口返回 429，准备重试', {
            url: params.url,
            attempt: nextAttempt,
            delayMs,
            limit: QPS_RETRY_LIMIT
          });
          setTimeout(() => {
            baseRequest(params, retryCount, nextAttempt).then(resolve).catch(reject);
          }, delayMs);
          return;
        }

        // 兼容新旧响应格式:优先使用 code/message,其次使用 errno/errmsg
        const code = String(data?.code ?? data?.errno ?? '');
        const message = String(data?.message ?? data?.errmsg ?? '');
        
        // 兼容不同的响应格式:
        // 1. 标准格式: { code, message, data: {...} } - 使用 data.data
        // 2. 扁平格式: { field1, field2, ... } - 直接使用整个 data 对象
        const payload = data?.data !== undefined ? data.data : data;
        
        console.log('[BaseRequest] 提取后的 payload:', {
          payload: payload,
          payloadType: typeof payload,
          payloadKeys: payload ? Object.keys(payload) : null
        });

        const authVerifyResult = errorHandler.handleAuthError(code)
        
        // 如果需要刷新 token
        if (authVerifyResult && typeof authVerifyResult === 'object' && authVerifyResult.needRefresh) {
          console.log('[BaseRequest] Token 需要刷新，尝试自动刷新');
          
          // 防止重复刷新：如果已经重试过一次，不再刷新
          if (retryCount >= 1) {
            console.error('[BaseRequest] Token 刷新后仍然失败，需要重新登录');
            Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            reject({ code, message, needRelogin: true });
            return;
          }

          // 使用刷新锁，避免并发刷新
          const { isRefreshing, refreshPromise } = getRefreshingState();
          
          if (isRefreshing && refreshPromise) {
            console.log('[BaseRequest] 等待其他请求完成 token 刷新');
            refreshPromise
              .then((newToken) => {
                console.log('[BaseRequest] Token 已被其他请求刷新，使用新 token 重试');
                params.header['Authorization'] = `Bearer ${newToken}`;
                baseRequest(params, retryCount + 1, qpsRetry).then(resolve).catch(reject);
              })
              .catch((err) => {
                console.error('[BaseRequest] Token 刷新失败');
                reject(err);
              });
            return;
          }

          // 开始刷新 token
          const newRefreshPromise = authorizationHandler.refreshToken()
            .then((newToken) => {
              console.log('[BaseRequest] Token 刷新成功，重试原请求');
              setRefreshingState(false, null);
              
              // 使用新 token 重试原请求
              params.header['Authorization'] = `Bearer ${newToken}`;
              return baseRequest(params, retryCount + 1, qpsRetry);
            })
            .catch((err) => {
              console.error('[BaseRequest] Token 刷新失败:', err);
              setRefreshingState(false, null);
              
              // 刷新失败，需要重新登录
              if (err.needRelogin) {
                authorizationHandler.redirectToRegister();
              }
              throw err;
            });

          setRefreshingState(true, newRefreshPromise);
          newRefreshPromise.then(resolve).catch(reject);
          return;
        }
        
        // 其他认证错误
        if (!authVerifyResult) {
          reject({ code, message, data: payload });
          return;
        }

        // 判定成功：code/errno === '0' 或者两者都不存在但有 payload 时视为成功
        if (code && code !== '0') {
          Taro.showToast({ title: message || '请求失败', icon: 'none' })
          reject({ code, message, data: payload });
          return;
        }

        resolve(payload, { code, message, data: payload })
      },
      fail: (err) => {
        const message = err?.message ?? '请求失败'
        Taro.showToast({ title: message, icon: 'none' })
        reject({ code: '-1', message, error: err })
      }
    })
  })
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
    needToken: true
  }

  const requestParam = {
    url: options.url ?? defaultConfig.url,
    data: options.data ?? defaultConfig.data,
    header: options.header ?? defaultConfig.header,
    method: options.method ?? defaultConfig.method,
    dataType: options.dataType ?? defaultConfig.dataType,
    responseType: options.responseType ?? defaultConfig.responseType,
    isNeedLoading: options.isNeedLoading ?? defaultConfig.isNeedLoading,
    loadingText: options.loadingText ?? defaultConfig.loadingText,
    needToken: options.needToken ?? defaultConfig.needToken
  }

  // token 已在 request 函数中处理，这里只设置其他通用 header
  const token = loadToken();
  console.log('[InterceptorsRequest] 设置 token 到 header', {
    hasToken: !!token,
    token: token?.substring(0, 20) + '...',
    url: requestParam.url
  });
  if (token) {
    requestParam.header['Authorization'] = `Bearer ${token}`;
  }
  requestParam.header['Frontend-Env'] = 'wx'
  requestParam.header['Wxshop-Id'] = config.wxshopid || '' 

  return requestParam
}
