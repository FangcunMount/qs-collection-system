import config from '../../config';
import { getWxApi } from '../../util/wxApi';
import { postUserRegister } from '../../services/api/register';

const namespace = 'registerUser';

class RegisterModel {
  async registerUser(payload = {}) {
    try {
      const jsCode = await this.fetchWxJsCode();
      const registerPayload = {
        jsCode,
        appId: config.appId || '',
        avatar: payload.avatar || '',
        email: payload.email || '',
        meta: payload.meta || {},
        name: payload.name || payload.username || payload.nickname || '',
        nickname: payload.nickname || payload.username || payload.name || '',
        phone: payload.phone || ''
      };

      const result = await postUserRegister(registerPayload);

      // postUserRegister 返回规范化对象 { code, message, data }
      // 为兼容旧逻辑，返回 data（如果存在），否则返回整个结果对象
      if (result && typeof result === 'object') {
        return result.data ?? result;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async fetchWxJsCode() {
    return new Promise((resolve, reject) => {
      try {
        const wxApi = getWxApi();
        if (!wxApi || !wxApi.login) {
          reject(new Error('微信API不可用'));
          return;
        }

        wxApi.login({
          success(loginRes) {
            if (loginRes?.code) {
              resolve(loginRes.code);
            } else {
              reject(new Error('未获取到有效的 jsCode'));
            }
          },
          fail(err) {
            reject(err);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

const registerModelInstance = new RegisterModel();

// Export functions for backward compatibility
export async function registerUser(payload = {}) {
  return registerModelInstance.registerUser(payload);
}

const RegisterModelExport = {
  namespace
};

export default RegisterModelExport;
