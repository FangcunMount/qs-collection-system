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
    const token = loadToken();
    if (token && isTokenExpired()) {
      console.log('[Request] Token 即将过期，先刷新再请求');
      try {
        await ensureTokenRefreshed();
      } catch (error) {
        console.error('[Request] Token 刷新失败:', error);
        // 刷新失败继续执行，让后续逻辑处理
      }
    }
  }
  
  const requestParams = interceptorsRequest({
    ...options,
    url: getUrl(url, options.host),
    data: params
  })

  // 加载 token，优先使用环境变量中的 token，其次使用全局数据中的 token
  const token = loadToken()
  console.log("........[Request] 请求参数:", requestParams, "Token:", token);

  if (requestParams.needToken && !token) {
    return new Promise((resolve, reject) => {
      authorizationHandler.login({appId: config.appId}).then((res) => {
        console.log('[Request] 自动登录成功，token:', res);
        requestParams.header['Authorization'] = `Bearer ${res}`;
        
        // login 方法已经通过 tokenStore 保存了完整的 token 数据
        
        baseRequest(requestParams)
          .then((result) => {
            resolve(result)
          }).catch((err) => {
            reject(err)
          });
      }).catch((err) => {
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
  console.log("[In Load Token]");
  
  // 1. 优先从 config 获取
  const configToken = config.token 
  if (configToken != undefined && configToken !== null) {
    console.info("[Load Token] 从 config 配置获取 token");
    return configToken
  }

  // 2. 从 tokenStore 获取
  const accessToken = getAccessToken();
  if (accessToken) {
    console.info("[Load Token] 从 TokenStore 获取到 access_token");
    return accessToken;
  }

  console.info("[Load Token] 未找到 token");
  return null;
}

function baseRequest(params, retryCount = 0) {
  if (params.isNeedLoading) {
    Taro.showLoading({ title: params.loadingText });
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      ...params,
      complete: () => { params.isNeedLoading && Taro.hideLoading() },
      success: (res) => {
        const data = res.data || {};

        // 兼容新旧响应格式：优先使用 code/message，其次使用 errno/errmsg
        const code = String(data?.code ?? data?.errno ?? '');
        const message = String(data?.message ?? data?.errmsg ?? '');
        const payload = data?.data;

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
                baseRequest(params, retryCount + 1).then(resolve).catch(reject);
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
              return baseRequest(params, retryCount + 1);
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
    method: options.method ?? defaultConfig.header,
    dataType: options.dataType ?? defaultConfig.dataType,
    responseType: options.responseType ?? defaultConfig.responseType,
    isNeedLoading: options.isNeedLoading ?? defaultConfig.isNeedLoading,
    loadingText: options.loadingText ?? defaultConfig.loadingText,
    needToken: options.needToken ?? defaultConfig.needToken
  }

  // token 已在 request 函数中处理，这里只设置其他通用 header
  const token = loadToken();
  if (token) {
    requestParam.header['Authorization'] = `Bearer ${token}`;
  }
  requestParam.header['Frontend-Env'] = 'wx'
  requestParam.header['Wxshop-Id'] = config.wxshopid || '' 

  return requestParam
}

