class WxApiToolkit {
  static isSupported() {
    // eslint-disable-next-line no-undef
    return typeof wx !== "undefined";
  }

  static getWxApi() {
    if (this.isSupported()) {
      // eslint-disable-next-line no-undef
      return wx;
    }

    throw new Error("此功能仅在微信小程序中可用，当前环境不支持 wx API");
  }

  static getMethod(methodName) {
    const api = this.getWxApi();
    const method = api?.[methodName];
    if (typeof method !== "function") {
      throw new Error(`wx.${methodName} 不存在或不是函数`);
    }
    return method.bind(api);
  }

  static invoke(methodName, ...args) {
    const method = this.getMethod(methodName);
    return method(...args);
  }
}

export const getWxApi = () => WxApiToolkit.getWxApi();

export default WxApiToolkit;
