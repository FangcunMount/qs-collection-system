const state = {
  userInfo: null,
  testeeList: [],
  selectedTesteeId: ''
};

const listeners = new Set();

const cloneState = () => ({
  userInfo: state.userInfo,
  testeeList: state.testeeList.map(item => ({ ...item })),
  selectedTesteeId: state.selectedTesteeId
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

export function getUserInfo() {
  return state.userInfo;
}

export function setUserInfo(info) {
  state.userInfo = info ?? null;
  notify();
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

export function getSelectedTesteeId() {
  return state.selectedTesteeId;
}

export function setSelectedTesteeId(testeeId) {
  state.selectedTesteeId = testeeId ? String(testeeId) : '';
  notify();
}

export function resetUserStore() {
  state.userInfo = null;
  state.testeeList = [];
  state.selectedTesteeId = '';
  notify();
}

export function subscribeUserStore(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

export default {
  getUserInfo,
  setUserInfo,
  getTesteeList,
  setTesteeList,
  addTestee,
  getSelectedTesteeId,
  setSelectedTesteeId,
  resetUserStore,
  subscribeUserStore
};
