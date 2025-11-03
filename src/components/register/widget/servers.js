import Taro from "@tarojs/taro";

import config from "../../../config";
import { getGlobalData } from "../../../util/globalData";

const host = config.iamHost

export const request = (url, params, options) => {
  const requestData = {
    url: host + url,
    data: params,
    header: {},
    method: "GET",
    dataType: "json",
    responseType: "text",
    loadingText: "正在加载...",
    ...options
  };

  requestData.header["token"] = getGlobalData("token") || config.token || "";

  if (options?.isNeedLoading) {
    Taro.showLoading({ title: requestData.loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      url: requestData.url,
      header: requestData.header,
      data: requestData.data,
      method: requestData.method,
      dataType: requestData.dataType,
      responseType: requestData.responseType,
      success: res => {
        const data = res.data;
        if (data.errno === "0") {
          resolve(data.data, data);
        } else {
          Taro.showToast({ title: data.errmsg, icon: "none" });
          reject(data);
        }
      },
      fail: err => {
        Taro.showToast({ title: "请求失败", icon: "none" });
        reject(err);
      },
      complete: () => {
        options?.isNeedLoading && Taro.hideLoading();
      }
    });
  });
};
