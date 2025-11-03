const authErrorMap = {
  '1001': '权限验证失败，请重新进入小程序',
  '1002': '未找到小程序用户',
  '100207': '用户未注册',  // 用户未注册错误码（errno）
  '102001': '用户未注册',  // 用户未注册错误码（code）
};

const ERRNO_USER_NOT_REGISTERED = '100207';  // 用户未注册错误码（在 data.errno 中）
const CODE_INVALID_CREDENTIALS = '102001';  // 无效凭证错误码（在 data.code 中）

let config = {}

/**
 * 获取微信小程序 API
 * @returns {object} 微信小程序全局对象 wx
 * @throws {Error} 如果不在微信小程序环境中运行
 */
const getWxApi = () => {
  // eslint-disable-next-line no-undef
  if (typeof wx !== 'undefined') {
    // eslint-disable-next-line no-undef
    return wx; // 微信小程序环境
  }
  
  // 非微信小程序环境
  throw new Error('此功能仅在微信小程序中可用，当前环境不支持 wx API');
};

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
              Method: 'wx:minip',
              Credentials: {
                AppID: params.appId,
                JSCode: loginRes.code
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
                
                // 处理 HTTP 状态码非 200 的情况
                if (requestRes.statusCode !== 200) {
                  const responseData = requestRes.data || {};
                  const errorCode = String(responseData.code || responseData.errno || '');
                  const errorMsg = responseData.message || responseData.errmsg || '登录失败';
                  
                  console.log('[Auth] 登录失败:', {
                    statusCode: requestRes.statusCode,
                    errorCode,
                    errorMsg
                  });
                  
                  // 检查是否是用户未注册（code: 102001 或 errno: 100207）
                  if (errorCode === CODE_INVALID_CREDENTIALS || errorCode === ERRNO_USER_NOT_REGISTERED) {
                    console.log('[Auth] 用户未注册，跳转到注册页面');
                    wxApi.reLaunch({
                      url: '/pages/register/index',
                    });
                    reject({
                      code: errorCode,
                      message: '用户未注册',
                      needRegister: true
                    });
                    return;
                  }
                  
                  // 其他错误
                  reject({
                    code: errorCode,
                    message: errorMsg,
                    statusCode: requestRes.statusCode
                  });
                  return;
                }
                
                // HTTP 200，检查业务逻辑错误码
                const { errno, errmsg, data } = requestRes.data;
                
                // 登录成功
                if (errno === '0') {
                  console.log('[Auth] 登录成功');
                  resolve(data.token);
                  return;
                }
                
                // 用户未注册
                if (errno === ERRNO_USER_NOT_REGISTERED) {
                  console.log('[Auth] 用户未注册（errno），跳转到注册页面');
                  wxApi.reLaunch({
                    url: '/pages/register/index',
                  });
                  reject({
                    errno,
                    errmsg: errmsg || '用户未注册',
                    needRegister: true
                  });
                  return;
                }
                
                // 其他业务错误
                console.log('[Auth] 业务错误:', { errno, errmsg });
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
}

class ErrorHandler {
  handleAuthError(errno) {
    if (authErrorMap.hasOwnProperty(errno)) {
      authorizationHandler.logout(
        authErrorMap[errno]
      );

      return false
    }

    return true
  }
}

export const initConfig = (cfg, project) => {
  config = { ...cfg, project };
};


export const authorizationHandler = new AuthorizationHandler();
export const errorHandler = new ErrorHandler();