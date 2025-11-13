/**
 * @typedef {Object} Testee
 * @property {string} id - 受试者ID
 * @property {string} name - 受试者名称
 */

/**
 * @typedef {Object} TesteeStoreState
 * @property {Testee[]} testeeList - 受试者列表
 * @property {string} selectedTesteeId - 当前选中的受试者ID
 * @property {boolean} isInitialized - 是否已初始化
 * @property {boolean} isLoading - 是否正在加载
 */

/** @type {TesteeStoreState} */
const state = {
  testeeList: [],
  selectedTesteeId: '',
  isInitialized: false,
  isLoading: false
};

const listeners = new Set();

const cloneState = () => ({
  testeeList: state.testeeList.map(item => ({ ...item })),
  selectedTesteeId: state.selectedTesteeId,
  isInitialized: state.isInitialized,
  isLoading: state.isLoading
});

function notify() {
  const snapshot = cloneState();
  listeners.forEach(listener => listener(snapshot));
}

function normalizeTestee(testee) {
  if (!testee) return null;
  const id = testee.id ?? testee.testeeid ?? testee.childid;
  if (!id) return null;
  return {
    id: String(id),
    name: testee.name ?? testee.testee_name ?? ''
  };
}

export function getTesteeList() {
  return state.testeeList;
}

export function setTesteeList(list = []) {
  const normalized = Array.isArray(list)
    ? list.map(normalizeTestee).filter(Boolean)
    : [];

  state.testeeList = normalized;

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

export function removeTestee(testeeId) {
  const id = String(testeeId);
  state.testeeList = state.testeeList.filter(item => item.id !== id);

  if (state.selectedTesteeId === id) {
    state.selectedTesteeId = state.testeeList.length > 0 ? state.testeeList[0].id : '';
  }

  notify();
}

export function getSelectedTesteeId() {
  return state.selectedTesteeId;
}

export function getSelectedTestee() {
  if (!state.selectedTesteeId) return null;
  return state.testeeList.find(item => item.id === state.selectedTesteeId) || null;
}

export function setSelectedTesteeId(testeeId) {
  state.selectedTesteeId = testeeId ? String(testeeId) : '';

  const exists = state.testeeList.some(item => item.id === state.selectedTesteeId);
  if (!exists && state.testeeList.length) {
    state.selectedTesteeId = state.testeeList[0].id;
  }

  notify();
}

export function isTesteeStoreInitialized() {
  return state.isInitialized;
}

export function isTesteeStoreLoading() {
  return state.isLoading;
}

export function getTesteeStoreState() {
  return cloneState();
}

export function resetTesteeStore() {
  state.testeeList = [];
  state.selectedTesteeId = '';
  state.isInitialized = false;
  state.isLoading = false;
  notify();
}

export function subscribeTesteeStore(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

export async function initTesteeStore(force = false) {
  if (state.isInitialized && !force) {
    console.log('[TesteeStore] 已初始化，跳过重复加载');
    return cloneState();
  }

  if (state.isLoading) {
    console.log('[TesteeStore] 正在加载中，等待完成...');
    return new Promise(resolve => {
      const unsubscribe = subscribeTesteeStore(snapshot => {
        if (!snapshot.isLoading) {
          unsubscribe();
          resolve(snapshot);
        }
      });
    });
  }

  state.isLoading = true;
  notify();

  try {
    const { getChildList } = await import('../services/api/user');
    const response = await getChildList();
    const list = Array.isArray(response)
      ? response
      : (response?.data || response?.list || response?.testee_list || []);

    setTesteeList(list);
    console.log('[TesteeStore] 受试者列表加载成功，共', list.length, '个');
    state.isInitialized = true;
  } catch (error) {
    console.error('[TesteeStore] 初始化失败:', error);
    setTesteeList([]);
    state.isInitialized = false;
  } finally {
    state.isLoading = false;
    notify();
  }

  const result = cloneState();
  console.log('[TesteeStore] 初始化完成:', result);
  return result;
}

export default {
  getTesteeList,
  setTesteeList,
  addTestee,
  removeTestee,
  getSelectedTesteeId,
  getSelectedTestee,
  setSelectedTesteeId,
  isTesteeStoreInitialized,
  isTesteeStoreLoading,
  getTesteeStoreState,
  resetTesteeStore,
  subscribeTesteeStore,
  initTesteeStore
};
