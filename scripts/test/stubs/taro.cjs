const noop = () => undefined;
const resolved = () => Promise.resolve({});

const taro = {
  getCurrentInstance: () => ({ router: { params: {}, path: '' } }),
  getMenuButtonBoundingClientRect: () => ({ bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }),
  getSystemInfoSync: () => ({ statusBarHeight: 0 }),
  hideLoading: noop,
  navigateBack: resolved,
  navigateTo: resolved,
  redirectTo: resolved,
  reLaunch: resolved,
  showLoading: noop,
  showModal: resolved,
  showToast: noop,
  stopPullDownRefresh: noop,
  useDidShow: noop,
  usePullDownRefresh: noop,
  useReady: noop,
  useRouter: () => ({ params: {} }),
  useShareAppMessage: noop
};

module.exports = taro;
module.exports.default = taro;
