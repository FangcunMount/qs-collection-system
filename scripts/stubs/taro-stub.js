/** Node seam tests 用 Taro 最小 stub */
module.exports = {
  getEnv: () => 'WEAPP',
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  request: () => Promise.resolve({}),
  connectSocket: () => ({ onOpen() {}, onMessage() {}, onError() {}, onClose() {}, close() {} }),
  showLoading: () => {},
  hideLoading: () => {},
  showToast: () => {},
};
