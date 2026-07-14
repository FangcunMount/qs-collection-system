const noop = () => undefined;
const resolved = () => Promise.resolve({});
const storage = new Map();
let routerParams = {};

const taro = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getCurrentInstance: () => ({ router: { params: {}, path: '' } }),
  getMenuButtonBoundingClientRect: () => ({ bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }),
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()) }),
  getStorageSync: (key) => storage.get(key),
  getSystemInfoSync: () => ({ statusBarHeight: 0 }),
  hideLoading: noop,
  navigateBack: resolved,
  navigateTo: resolved,
  redirectTo: resolved,
  reLaunch: resolved,
  removeStorageSync: (key) => storage.delete(key),
  requestSubscribeMessage: resolved,
  scanCode: resolved,
  setStorageSync: (key, value) => storage.set(key, value),
  showLoading: noop,
  showModal: resolved,
  showToast: noop,
  stopPullDownRefresh: noop,
  useDidShow: noop,
  usePullDownRefresh: noop,
  useReady: noop,
  useRouter: () => ({ params: routerParams }),
  useShareAppMessage: noop,
  __setRouterParams: (params) => {
    routerParams = params || {};
  }
};

module.exports = taro;
module.exports.default = taro;
