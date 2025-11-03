/**
 * UserStore State 结构定义
 * @typedef {Object} UserInfo
 * @property {string} id - 用户ID
 * @property {string} name - 用户名称
 * @property {string} [avatar] - 用户头像
 * @property {string} [phone] - 手机号
 * @property {*} [其他字段] - 后端返回的其他字段
 */

/**
 * @typedef {Object} Testee
 * @property {string} id - 受试者ID
 * @property {string} name - 受试者名称
 */

/**
 * @typedef {Object} UserStoreState
 * @property {UserInfo|null} userInfo - 当前用户信息
 * @property {Testee[]} testeeList - 受试者列表
 * @property {string} selectedTesteeId - 当前选中的受试者ID
 * @property {boolean} isInitialized - 是否已初始化
 * @property {boolean} isLoading - 是否正在加载
 */

/** @type {UserStoreState} */
const state = {
  userInfo: null,
  testeeList: [],
  selectedTesteeId: '',
  isInitialized: false,
  isLoading: false
};

const listeners = new Set();

/**
 * 克隆当前状态（深拷贝）
 * @returns {UserStoreState}
 */
const cloneState = () => ({
  userInfo: state.userInfo ? { ...state.userInfo } : null,
  testeeList: state.testeeList.map(item => ({ ...item })),
  selectedTesteeId: state.selectedTesteeId,
  isInitialized: state.isInitialized,
  isLoading: state.isLoading
});

/**
 * 通知所有订阅者状态已更新
 */
function notify() {
  const snapshot = cloneState();
  listeners.forEach(listener => listener(snapshot));
}

/**
 * 归一化受试者数据
 * @param {*} testee - 原始受试者数据
 * @returns {Testee|null}
 */
function normalizeTestee(testee) {
  if (!testee) return null;
  const id = testee.id ?? testee.testeeid ?? testee.childid;
  if (!id) return null;
  return {
    id: String(id),
    name: testee.name ?? testee.testee_name ?? ''
  };
}

/**
 * 获取当前用户信息
 * @returns {UserInfo|null}
 */
export function getUserInfo() {
  return state.userInfo;
}

/**
 * 设置用户信息
 * @param {UserInfo|null} info - 用户信息对象
 */
export function setUserInfo(info) {
  state.userInfo = info ?? null;
  notify();
}

/**
 * 获取受试者列表
 * @returns {Testee[]}
 */
export function getTesteeList() {
  return state.testeeList;
}

/**
 * 设置受试者列表
 * @param {Array} list - 受试者列表（支持多种格式）
 */
export function setTesteeList(list = []) {
  const normalized = Array.isArray(list)
    ? list.map(normalizeTestee).filter(Boolean)
    : [];
  state.testeeList = normalized;
  
  // 自动选择逻辑
  if (normalized.length) {
    const hasSelected = normalized.some(item => item.id === state.selectedTesteeId);
    if (!hasSelected) {
      state.selectedTesteeId = normalized[0].id;
    }
  } else {
    state.selectedTesteeId = '';
  }
  notify();
}

/**
 * 添加单个受试者（如果已存在则更新）
 * @param {*} testee - 受试者数据
 */
export function addTestee(testee) {
  const normalized = normalizeTestee(testee);
  if (!normalized) return;
  
  const existingIndex = state.testeeList.findIndex(item => item.id === normalized.id);
  if (existingIndex > -1) {
    state.testeeList[existingIndex] = normalized;
  } else {
    state.testeeList = [...state.testeeList, normalized];
  }
  
  if (!state.selectedTesteeId) {
    state.selectedTesteeId = normalized.id;
  }
  notify();
}

/**
 * 删除受试者
 * @param {string} testeeId - 受试者ID
 */
export function removeTestee(testeeId) {
  const id = String(testeeId);
  state.testeeList = state.testeeList.filter(item => item.id !== id);
  
  // 如果删除的是当前选中的，自动选择第一个
  if (state.selectedTesteeId === id) {
    state.selectedTesteeId = state.testeeList.length > 0 ? state.testeeList[0].id : '';
  }
  notify();
}

/**
 * 获取当前选中的受试者ID
 * @returns {string}
 */
export function getSelectedTesteeId() {
  return state.selectedTesteeId;
}

/**
 * 获取当前选中的受试者对象
 * @returns {Testee|null}
 */
export function getSelectedTestee() {
  if (!state.selectedTesteeId) return null;
  return state.testeeList.find(item => item.id === state.selectedTesteeId) || null;
}

/**
 * 设置选中的受试者
 * @param {string} testeeId - 受试者ID
 */
export function setSelectedTesteeId(testeeId) {
  state.selectedTesteeId = testeeId ? String(testeeId) : '';
  notify();
}

/**
 * 检查是否已初始化
 * @returns {boolean}
 */
export function isStoreInitialized() {
  return state.isInitialized;
}

/**
 * 检查是否正在加载
 * @returns {boolean}
 */
export function isStoreLoading() {
  return state.isLoading;
}

/**
 * 获取完整的 store 状态（只读）
 * @returns {UserStoreState}
 */
export function getStoreState() {
  return cloneState();
}

/**
 * 重置 UserStore 到初始状态
 */
export function resetUserStore() {
  state.userInfo = null;
  state.testeeList = [];
  state.selectedTesteeId = '';
  state.isInitialized = false;
  state.isLoading = false;
  notify();
}

/**
 * 订阅 UserStore 状态变化
 * @param {Function} listener - 监听函数，接收 state 快照
 * @returns {Function} 取消订阅的函数
 */
export function subscribeUserStore(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

/**
 * 初始化用户 store
 * 在小程序启动时调用，加载：
 * 1. 当前用户信息
 * 2. 当前用户对应的受试者列表
 * 3. 自动选择第一个受试者
 * @param {boolean} force - 是否强制重新初始化（默认 false）
 * @returns {Promise<UserStoreState>}
 */
export async function initUserStore(force = false) {
  // 如果已初始化且非强制模式，直接返回当前状态
  if (state.isInitialized && !force) {
    console.log('[UserStore] 已初始化，跳过重复加载');
    return cloneState();
  }
  
  // 如果正在加载中，等待加载完成
  if (state.isLoading) {
    console.log('[UserStore] 正在加载中，等待完成...');
    return new Promise((resolve) => {
      const unsubscribe = subscribeUserStore((snapshot) => {
        if (!snapshot.isLoading) {
          unsubscribe();
          resolve(snapshot);
        }
      });
    });
  }
  
  // 设置加载状态
  state.isLoading = true;
  notify();
  
  try {
    // 动态导入避免循环依赖
    const { getUserInfo: fetchUserInfo, getChildList } = await import('../services/api/user');
    
    // 并行加载用户信息和受试者列表
    const [userInfoRes, testeeListRes] = await Promise.allSettled([
      fetchUserInfo(),
      getChildList()
    ]);
    
    // 处理用户信息
    if (userInfoRes.status === 'fulfilled' && userInfoRes.value) {
      setUserInfo(userInfoRes.value);
      console.log('[UserStore] 用户信息加载成功:', userInfoRes.value);
    } else {
      console.warn('[UserStore] 用户信息加载失败:', userInfoRes.reason);
      setUserInfo(null);
    }
    
    // 处理受试者列表
    if (testeeListRes.status === 'fulfilled' && testeeListRes.value) {
      const list = Array.isArray(testeeListRes.value) 
        ? testeeListRes.value 
        : (testeeListRes.value.data || testeeListRes.value.list || []);
      
      setTesteeList(list);
      console.log('[UserStore] 受试者列表加载成功，共', list.length, '个');
    } else {
      console.warn('[UserStore] 受试者列表加载失败:', testeeListRes.reason);
      setTesteeList([]);
    }
    
    // 标记为已初始化
    state.isInitialized = true;
    state.isLoading = false;
    notify();
    
    const result = cloneState();
    console.log('[UserStore] 初始化完成:', result);
    return result;
    
  } catch (error) {
    console.error('[UserStore] 初始化失败:', error);
    
    // 重置状态
    state.isLoading = false;
    state.isInitialized = false;
    notify();
    
    // 即使失败也不抛出错误，保证小程序能继续运行
    return cloneState();
  }
}

// 默认导出所有 API
export default {
  // 用户信息
  getUserInfo,
  setUserInfo,
  
  // 受试者列表
  getTesteeList,
  setTesteeList,
  addTestee,
  removeTestee,
  
  // 选中状态
  getSelectedTesteeId,
  getSelectedTestee,
  setSelectedTesteeId,
  
  // Store 状态
  isStoreInitialized,
  isStoreLoading,
  getStoreState,
  
  // 生命周期
  resetUserStore,
  subscribeUserStore,
  initUserStore
};
