import { getWxApi } from './wxApi';
import { setToken, getRefreshToken } from '../store/tokenStore';

const authErrorMap = {
  '1001': '权限验证失败，请重新进入小程序',
  '1002': '未找到小程序用户',
  '100207': '用户未注册',  // 用户未注册错误码（errno）
  '102001': '用户未注册',  // 用户未注册错误码（code）
};

const ERRNO_USER_NOT_REGISTERED = '102404';  // 兼容旧的 errno 未注册码（保留）
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
            console.log('wx.login res:', loginRes);
            
            // 修复：登录失败应该 reject 而不是 resolve
            if (!loginRes.code) {
              reject(new Error('获取登录凭证失败'));
              return;
            }

            let loginParams = {
              Method: 'wechat',
              Credentials: {
                app_id: params.appId,
                code: loginRes.code
              },
              Audience: 'mobile',
            }

            console.log('login params:', loginParams);

            wxApi.request({
              url: `${config.iamHost}/auth/login?display=json`,
              data: loginParams,
              method: "POST",
              dataType: "json",
              responseType: "text",
              success(requestRes) {
                console.log('[Auth] 登录响应:', requestRes);

                // HTTP 200，检查业务逻辑错误码，兼容新旧字段
                const resp = requestRes.data || {};
                const code = String(resp?.code ?? resp?.errno ?? '');
                const message = resp?.message ?? resp?.errmsg ?? '';
                const data = resp?.data;

                // 登录成功（code/errno === '0' 或者 code 为空但存在 data）
                if (!code || code === '0') {
                  console.log('[Auth] 登录成功, data:', data);
                  
                  // 保存完整的 token 数据到 tokenStore
                  if (data) {
                    setToken(data);
                  }
                  
                  // 返回 access_token
                  const accessToken = data?.access_token ?? data?.token ?? data;
                  resolve(accessToken);
                  return;
                }

                // 用户未注册（兼容多种后端返回）
                if (code === ERRNO_USER_NOT_REGISTERED || code === '100207' || code === '102001') {
                  console.log('[Auth] 用户未注册（code/errno），跳转到注册页面');
                  wxApi.reLaunch({
                    url: '/pages/register/index',
                  });
                  reject({
                    code,
                    message: message || '用户未注册',
                    needRegister: true
                  });
                  return;
                }

                // 其他业务错误
                console.log('[Auth] 业务错误:', { code, message });
                reject(requestRes.data);
              },
              fail(err) {
                console.error('[Auth] 请求失败:', err);
                reject(err);
              }
            });
          },
          fail(err) {
            reject(err);
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  logout(errmsg) {
    try {
      const wxApi = getWxApi();
      wxApi.reLaunch({
        url: `/pages/errpage/errpage?text=${errmsg}`,
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
        ? `/pages/register/index?${queryString}`
        : '/pages/register/index';
      
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

        wxApi.request({
          url: `${config.iamHost}/auth/refresh?display=json`,
          data: {
            refresh_token: refreshToken
          },
          method: "POST",
          dataType: "json",
          responseType: "text",
          success(requestRes) {
            console.log('[Auth] 刷新 token 响应:', requestRes);

            const resp = requestRes.data || {};
            const code = String(resp?.code ?? resp?.errno ?? '');
            const message = resp?.message ?? resp?.errmsg ?? '';
            const data = resp?.data;

            // 刷新成功
            if (!code || code === '0') {
              if (data) {
                // 使用 tokenStore 更新 token
                setToken(data);
                
                const newAccessToken = data?.access_token ?? data?.token ?? data;
                resolve(newAccessToken);
                return;
              }
            }

            // 刷新失败
            console.error('[Auth] Token 刷新失败:', { code, message });
            reject({ code, message, needRelogin: true });
          },
          fail(err) {
            console.error('[Auth] Token 刷新请求失败:', err);
            reject(err);
          }
        });
      } catch (error) {
        console.error('[Auth] Token 刷新异常:', error);
        reject(error);
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
