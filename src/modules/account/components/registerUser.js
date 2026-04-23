import config from "@/config.js";
import { getWxApi } from "@/shared/platform/weapp/wxApi";
import { postUserRegister } from "@/services/api/account";

class RegisterUserModel {
  async registerUser(payload = {}) {
    const jsCode = await this.fetchWxJsCode();
    const registerPayload = {
      jsCode,
      appId: config.appId || "",
      avatar: payload.avatar || "",
      email: payload.email || "",
      meta: payload.meta || {},
      name: payload.name || payload.username || payload.nickname || "",
      nickname: payload.nickname || payload.username || payload.name || "",
      phone: payload.phone || ""
    };

    const result = await postUserRegister(registerPayload);
    if (result && typeof result === "object") {
      return result.data ?? result;
    }

    return result;
  }

  async fetchWxJsCode() {
    return new Promise((resolve, reject) => {
      try {
        const wxApi = getWxApi();
        if (!wxApi?.login) {
          reject(new Error("微信API不可用"));
          return;
        }

        wxApi.login({
          success(loginRes) {
            if (loginRes?.code) {
              resolve(loginRes.code);
              return;
            }

            reject(new Error("未获取到有效的 jsCode"));
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

const registerUserModel = new RegisterUserModel();

export async function registerUser(payload = {}) {
  return registerUserModel.registerUser(payload);
}

export default registerUserModel;
