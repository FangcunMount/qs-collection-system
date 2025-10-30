const authErrorMap = {
  '1001': '权限验证失败，请重新进入小程序',
  '1002': '未找到小程序用户',
};

let config = {}

class AuthorizationHandler {
  login(params = {}, header = {}) {
    return new Promise((resolve, reject) => {
      
      wx.login({
        success(res) {
          if (!res.code) {
            resolve(res.code);
          }

          wx.request({
            url: `${config.host}/auth/gettoken?display=json`,
            data: { code: res.code, ...params },
            method: "GET",
            dataType: "json",
            responseType: "text",
            success(res) {
              if (res.data.errno != '0') reject(res.data)
              resolve(res.data.data.token)
            },
            fail(err) {
              reject(err)
            }
          });
        },
        fail(err) {
          reject(err);
        },
      });
    });
  }

  logout(errmsg) {
    wx.reLaunch({
      url: `/pages/errpage/errpage?text=${errmsg}`,
    })
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