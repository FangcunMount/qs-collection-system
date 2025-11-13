/**
 * WxApiToolkit 提供对微信小程序全局 `wx` 对象的集中访问，便于在非小程序环境下统一抛错。
 */
class WxApiToolkit {
  /**
   * 判断当前环境是否存在 wx 对象
   * @returns {boolean}
   */
  static isSupported() {
    // eslint-disable-next-line no-undef
    return typeof wx !== 'undefined';
  }

  /**
   * 获取微信小程序全局对象
   * @returns {WechatMiniprogram.Wx | object}
   */
  static getWxApi() {
    if (this.isSupported()) {
      // eslint-disable-next-line no-undef
      return wx;
    }
    throw new Error('此功能仅在微信小程序中可用，当前环境不支持 wx API');
  }

  /**
   * 获取指定方法的绑定实现，便于在工具函数中安全调用
   * @param {string} methodName - wx 上的方法名
   * @returns {Function}
   */
  static getMethod(methodName) {
    const api = this.getWxApi();
    const method = api?.[methodName];
    if (typeof method !== 'function') {
      throw new Error(`wx.${methodName} 不存在或不是函数`);
    }
    return method.bind(api);
  }

  /**
   * 直接调用指定 wx 方法
   * @param {string} methodName - wx 上的方法名
   * @param  {...any} args - 透传参数
   * @returns {*}
   */
  static invoke(methodName, ...args) {
    const method = this.getMethod(methodName);
    return method(...args);
  }
}

export const getWxApi = () => WxApiToolkit.getWxApi();
export default WxApiToolkit;
