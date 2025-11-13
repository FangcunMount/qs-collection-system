import { getUserInfo as fetchUserProfile } from '../services/api/user';

const namespace = 'user';

const initialState = {
  currentUser: {},
  userInfo: {
    name: '',
    picture: ''
  },
  clinic: {
    id: '',
    title: ''
  },
  roles: [],
  isInitialized: false,
  isLoading: false
};

let state = { ...initialState };
const listeners = new Set();

const cloneState = () => ({
  ...state,
  currentUser: { ...state.currentUser },
  userInfo: state.userInfo ? { ...state.userInfo } : null,
  clinic: { ...state.clinic },
  roles: Array.isArray(state.roles) ? [...state.roles] : []
});

function notify() {
  const snapshot = cloneState();
  listeners.forEach(listener => listener(snapshot));
}

const reducers = {
  saveCurrentUser(currentState, payload = {}) {
    return { ...currentState, currentUser: payload || {} };
  },
  changeNotifyCount(currentState, payload = {}) {
    const { totalCount = 0, unreadCount = 0 } = payload;
    return {
      ...currentState,
      currentUser: {
        ...currentState.currentUser,
        notifyCount: totalCount,
        unreadCount
      }
    };
  },
  save(currentState, payload = {}) {
    return { ...currentState, ...payload };
  },
  setLoading(currentState, flag) {
    return { ...currentState, isLoading: Boolean(flag) };
  },
  setInitialized(currentState, flag) {
    return { ...currentState, isInitialized: Boolean(flag) };
  },
  reset() {
    return { ...initialState };
  }
};

function dispatch(type, payload) {
  const reducer = reducers[type];
  if (!reducer) {
    console.warn(`[UserStore] 未找到 reducer: ${type}`);
    return state;
  }
  state = reducer(state, payload);
  notify();
  return state;
}

const call = (fn, ...args) => fn(...args);
const put = ({ type, payload }) => dispatch(type, payload);

const effects = {
  async getUserInfo(_, helpers = { call, put }) {
    const response = await helpers.call(fetchUserProfile);
    if (!response) {
      return null;
    }
    helpers.put({
      type: 'save',
      payload: {
        userInfo: response,
        clinic: response?.clinic || state.clinic,
        roles: response?.roles || state.roles
      }
    });
    return response;
  },
  async fetch(_, helpers = { call, put }) {
    return effects.getUserInfo(_, helpers);
  },
  async fetchCurrent(_, helpers = { call, put }) {
    const response = await helpers.call(fetchUserProfile);
    if (response) {
      helpers.put({ type: 'saveCurrentUser', payload: response });
    }
    return response;
  }
};

function runEffect(effectName, payload) {
  const effect = effects[effectName];
  if (!effect) {
    throw new Error(`[UserStore] 未找到 effect: ${effectName}`);
  }
  return effect(payload, { call, put });
}

export function getUserInfo() {
  return state.userInfo;
}

export function setUserInfo(info) {
  dispatch('save', { userInfo: info ?? null });
}

export function isUserStoreInitialized() {
  return state.isInitialized;
}

export function isUserStoreLoading() {
  return state.isLoading;
}

export function getUserStoreState() {
  return cloneState();
}

export function resetUserStore() {
  dispatch('reset');
}

export function subscribeUserStore(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

export async function initUserStore(force = false) {
  if (state.isInitialized && !force) {
    console.log('[UserStore] 已初始化，跳过重复加载');
    return cloneState();
  }

  if (state.isLoading) {
    console.log('[UserStore] 正在加载中，等待完成...');
    return new Promise(resolve => {
      const unsubscribe = subscribeUserStore(snapshot => {
        if (!snapshot.isLoading) {
          unsubscribe();
          resolve(snapshot);
        }
      });
    });
  }

  dispatch('setLoading', true);

  try {
    await runEffect('getUserInfo');
    dispatch('setInitialized', true);
  } catch (error) {
    console.error('[UserStore] 初始化失败:', error);
    dispatch('setInitialized', false);
    dispatch('save', { userInfo: null });
  } finally {
    dispatch('setLoading', false);
  }

  const result = cloneState();
  console.log('[UserStore] 初始化完成:', result);
  return result;
}

const UserModel = {
  namespace,
  get state() {
    return cloneState();
  },
  reducers,
  effects
};

export default UserModel;
