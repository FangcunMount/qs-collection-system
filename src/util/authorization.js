import { getWxApi } from './wxApi';
import { setToken, getRefreshToken, clearToken, getAccessToken } from '../store/tokenStore';

const authErrorMap = {
  '1001': '权限验证失败，请重新进入小程序',
  '1002': '未找到小程序用户',
  '100207': '用户未注册',  // 用户未注册错误码（errno）
  '102001': '用户未注册',  // 用户未注册错误码（code）
  '102404': '用户未注册',  // 兼容旧的 errno 未注册码
};

const ERRNO_TOKEN_EXPIRED = '401';  // Token 过期
const ERRNO_TOKEN_INVALID = '403';  // Token 无效

let config = {}

class AuthorizationHandler {
  login(params = {}) {
    return new Promise((resolve, reject) => {
      try {
        const wxApi = getWxApi();
        
        wxApi.login({
          success(loginRes) {
            console.log('[Auth] wx.login 成功:', loginRes);
            
            if (!loginRes.code) {
              reject(new Error('获取登录凭证失败'));
              return;
            }

            // 使用新的 IAM authn API
            console.log('[Auth] 调用 IAM /authn/login');
            
            wxApi.request({
              url: `${config.iamHost}/authn/login`,
              data: {
                method: 'wechat',
                credentials: {
                  app_id: params.appId || config.appId,
                  code: loginRes.code
                },
                audience: 'mobile'
              },
              method: "POST",
              dataType: "json",
              responseType: "text",
              success(requestRes) {
                console.log('[Auth] 登录响应:', requestRes);

                const resp = requestRes.data || {};

                // 检查 HTTP 状态码
                if (requestRes.statusCode !== 200) {
                  const code = String(resp?.code ?? resp?.errno ?? resp?.error ?? '');
                  const message = resp?.message ?? resp?.errmsg ?? resp?.error_description ?? '登录请求失败';
                  console.error('[Auth] HTTP 错误:', requestRes.statusCode, { code, message });

                  if (requestRes.statusCode === 401) {
                    console.log('[Auth] 登录返回 401，跳转到注册页面');
                    wxApi.reLaunch({
                      url: '/pages/user/register/index',
                    });
                    reject({
                      statusCode: requestRes.statusCode,
                      code,
                      message: authErrorMap[code] || message,
                      needRegister: true
                    });
                    return;
                  }

                  reject({
                    statusCode: requestRes.statusCode,
                    code,
                    message
                  });
                  return;
                }
                console.log('[Auth] 响应数据结构:', { 
                  hasAccessToken: !!resp.access_token,
                  hasData: !!resp.data,
                  hasDataAccessToken: !!resp.data?.access_token,
                  code: resp.code,
                  message: resp.message
                });
                
                // IAM 新接口可能直接返回 token,也可能在 data 字段中
                const tokenData = resp.access_token ? resp : resp.data;
                
                if (tokenData?.access_token) {
                  console.log('[Auth] 登录成功,access_token 长度:', tokenData.access_token.length);
                  
                  // 保存完整的 token 数据到 tokenStore
                  setToken(tokenData);
                  
                  resolve(tokenData.access_token);
                  return;
                }
                
                // 处理错误响应
                const code = String(resp?.code ?? resp?.errno ?? resp?.error ?? '');
                const message = resp?.message ?? resp?.errmsg ?? resp?.error_description ?? '登录失败';
                
                console.error('[Auth] 响应中未找到 access_token,判定为登录失败');

                // 用户未注册
                if (authErrorMap[code] && authErrorMap[code].includes('未注册')) {
                  console.log('[Auth] 用户未注册，跳转到注册页面');
                  wxApi.reLaunch({
                    url: '/pages/user/register/index',
                  });
                  reject({
                    code,
                    message: authErrorMap[code] || message,
                    needRegister: true
                  });
                  return;
                }

                // 其他业务错误
                console.error('[Auth] 登录失败:', { code, message });
                reject({ code, message, data: resp });
              },
              fail(err) {
                console.error('[Auth] 请求失败:', err);
                reject(err);
              }
            });
          },
          fail(err) {
            console.error('[Auth] wx.login 失败:', err);
            reject(err);
          },
        });
      } catch (error) {
        console.error('[Auth] login 异常:', error);
        reject(error);
      }
    });
  }

  logout(errmsg) {
    try {
      // 清除 token
      clearToken();
      
      const wxApi = getWxApi();
      wxApi.reLaunch({
        url: `/pages/system/error/errpage?text=${errmsg}`,
      });
    } catch (error) {
      console.error('logout 失败:', error);
      // 在非小程序环境中，可以使用其他方式处理（如跳转到错误页面）
      throw error;
    }
  }

  /**
   * 跳转到注册页面
   * @param {Object} params - 注册页面参数
   */
  redirectToRegister(params = {}) {
    try {
      const wxApi = getWxApi();
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      const url = queryString 
        ? `/pages/user/register/index?${queryString}`
        : '/pages/user/register/index';
      
      console.log('[Auth] 跳转到注册页面:', url);
      wxApi.reLaunch({ url });
    } catch (error) {
      console.error('跳转注册页面失败:', error);
      throw error;
    }
  }

  /**
   * 使用 refresh_token 刷新 access_token
   * @returns {Promise<string>} 新的 access_token
   */
  refreshToken() {
    return new Promise((resolve, reject) => {
      try {
        const wxApi = getWxApi();
        
        // 从 tokenStore 获取 refresh_token
        const refreshToken = getRefreshToken();
        
        if (!refreshToken) {
          console.error('[Auth] 未找到 refresh_token');
          reject(new Error('未找到 refresh_token'));
          return;
        }

        console.log('[Auth] 使用 refresh_token 刷新 token');

        // 使用新的 IAM authn API
        wxApi.request({
          url: `${config.iamHost}/authn/refresh_token`,
          data: {
            refresh_token: refreshToken
          },
          method: "POST",
          dataType: "json",
          responseType: "text",
          success(requestRes) {
            console.log('[Auth] 刷新 token 响应:', requestRes);

            // 检查 HTTP 状态码
            if (requestRes.statusCode !== 200) {
              console.error('[Auth] 刷新失败 HTTP 错误:', requestRes.statusCode);
              reject({
                statusCode: requestRes.statusCode,
                message: '刷新令牌失败',
                needRelogin: true
              });
              return;
            }

            const resp = requestRes.data || {};
            // 兼容两种返回格式:
            // 1) 直接返回 token 字段: { access_token, refresh_token, ... }
            // 2) 带 data 包裹: { code: 0, message: 'success', data: { access_token, ... } }
            const payload = resp?.data ?? resp;

            if (payload?.access_token) {
              console.log('[Auth] Token 刷新成功，响应数据:', {
                hasAccessToken: !!payload.access_token,
                hasRefreshToken: !!payload.refresh_token,
                tokenType: payload.token_type,
                expiresIn: payload.expires_in
              });
              
              // 使用 tokenStore 更新 token
              setToken(payload);
              
              // 验证 token 是否保存成功
              const savedAccessToken = getAccessToken();
              const savedRefreshToken = getRefreshToken();
              console.log('[Auth] Token 保存后验证:', {
                savedAccessToken: savedAccessToken?.substring(0, 20) + '...',
                savedRefreshToken: savedRefreshToken?.substring(0, 20) + '...'
              });
              
              resolve(payload.access_token);
              return;
            }

            // 刷新失败
            const code = String(resp?.code ?? resp?.errno ?? resp?.error ?? '');
            const message = resp?.message ?? resp?.errmsg ?? resp?.error_description ?? '刷新失败';
            
            console.error('[Auth] Token 刷新失败:', { code, message });
            reject({ code, message, needRelogin: true });
          },
          fail(err) {
            console.error('[Auth] Token 刷新请求失败:', err);
            reject({ ...err, needRelogin: true });
          }
        });
      } catch (error) {
        console.error('[Auth] Token 刷新异常:', error);
        reject({ error, needRelogin: true });
      }
    });
  }
}

class ErrorHandler {
  handleAuthError(code) {
    // 兼容传入 errno 或新的 code 字段
    const key = String(code ?? '');
    
    // Token 过期或无效，不立即 logout，返回特殊标记让上层处理刷新
    if (key === ERRNO_TOKEN_EXPIRED || key === ERRNO_TOKEN_INVALID) {
      console.log('[ErrorHandler] Token 过期或无效，需要刷新');
      return { needRefresh: true, code: key };
    }
    
    // 其他认证错误，执行 logout
    if (authErrorMap.hasOwnProperty(key)) {
      authorizationHandler.logout(
        authErrorMap[key]
      );
      return false;
    }

    return true;
  }
}

export const initConfig = (cfg, project) => {
  config = { ...cfg, project };
};


export const authorizationHandler = new AuthorizationHandler();
export const errorHandler = new ErrorHandler();
