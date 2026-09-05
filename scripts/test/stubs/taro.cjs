const noop = () => undefined;
const resolved = () => Promise.resolve({});
const storage = new Map();
let routerParams = {};

const taro = {
  canIUse: () => false,
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getCurrentInstance: () => ({ router: { params: {}, path: '' } }),
  getMenuButtonBoundingClientRect: () => ({ bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }),
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()) }),
  getStorageSync: (key) => storage.get(key),
  getSystemInfoSync: () => ({ statusBarHeight: 0 }),
  hideLoading: noop,
  nextTick: (callback) => callback(),
  navigateBack: resolved,
  navigateTo: resolved,
  redirectTo: resolved,
  reLaunch: resolved,
  removeStorageSync: (key) => storage.delete(key),
  requestSubscribeMessage: resolved,
  scanCode: resolved,
  setNavigationBarTitle: resolved,
  setStorageSync: (key, value) => storage.set(key, value),
  showLoading: noop,
  showModal: resolved,
  showToast: noop,
  stopPullDownRefresh: noop,
  useDidShow: noop,
  useDidHide: noop,
  useUnload: noop,
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
