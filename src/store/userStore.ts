import { getMe } from '../services/api/iamIdentityApi';

/**
 * 用户信息接口
 */
export interface UserInfo {
  id?: string;
  name: string;
  picture: string;
  nickname?: string;
  legalName?: string;
  avatarUrl?: string;
  mobile?: string;
  email?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 诊所信息接口
 */
export interface Clinic {
  id: string;
  title: string;
}

/**
 * 角色接口
 */
export interface Role {
  id?: string;
  name?: string;
  code?: string;
  [key: string]: any;
}

/**
 * UserStore 状态接口
 */
export interface UserStoreState {
  currentUser: Record<string, any>;
  userInfo: UserInfo | null;
  clinic: Clinic;
  roles: Role[];
  isInitialized: boolean;
  isLoading: boolean;
}

/**
 * Reducer 类型
 */
type Reducer = (currentState: UserStoreState, payload?: any) => UserStoreState;

/**
 * Effect 辅助函数类型
 */
interface EffectHelpers {
  call: <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
  put: (action: { type: string; payload?: any }) => void;
}

/**
 * Effect 函数类型
 */
type Effect = (payload: any, helpers?: EffectHelpers) => Promise<any>;

const namespace = 'user';

const initialState: UserStoreState = {
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

let state: UserStoreState = { ...initialState };
const listeners = new Set<(state: UserStoreState) => void>();

/**
 * 克隆状态
 */
const cloneState = (): UserStoreState => ({
  ...state,
  currentUser: { ...state.currentUser },
  userInfo: state.userInfo ? { ...state.userInfo } : null,
  clinic: { ...state.clinic },
  roles: Array.isArray(state.roles) ? [...state.roles] : []
});

/**
 * 通知所有监听器
 */
function notify(): void {
  const snapshot = cloneState();
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[UserStore] 监听器执行失败:', error);
    }
  });
}

/**
 * Reducers
 */
const reducers: Record<string, Reducer> = {
  saveCurrentUser(currentState: UserStoreState, payload: Record<string, any> = {}): UserStoreState {
    return { ...currentState, currentUser: payload || {} };
  },
  changeNotifyCount(currentState: UserStoreState, payload: { totalCount?: number; unreadCount?: number } = {}): UserStoreState {
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
  save(currentState: UserStoreState, payload: Partial<UserStoreState> = {}): UserStoreState {
    return { ...currentState, ...payload };
  },
  setLoading(currentState: UserStoreState, flag: boolean): UserStoreState {
    return { ...currentState, isLoading: Boolean(flag) };
  },
  setInitialized(currentState: UserStoreState, flag: boolean): UserStoreState {
    return { ...currentState, isInitialized: Boolean(flag) };
  },
  reset(): UserStoreState {
    return { ...initialState };
  }
};

/**
 * Dispatch 函数
 */
function dispatch(type: string, payload?: any): UserStoreState {
  const reducer = reducers[type];
  if (!reducer) {
    console.warn(`[UserStore] 未找到 reducer: ${type}`);
    return state;
  }
  state = reducer(state, payload);
  notify();
  return state;
}

/**
 * Effect 辅助函数
 */
const call = <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> => fn(...args);
const put = ({ type, payload }: { type: string; payload?: any }): void => {
  dispatch(type, payload);
};

/**
 * Effects
 */
const effects: Record<string, Effect> = {
  async getUserInfo(_: any, helpers: EffectHelpers = { call, put }): Promise<UserInfo | null> {
    // 使用新的 IAM Identity API
    const response = await helpers.call(getMe);
    if (!response) {
      return null;
    }
    
    // 转换 IAM 用户数据格式
    const userInfo: UserInfo = {
      id: response.id,
      name: response.nickname || response.legal_name || '',
      picture: response.avatar_url || '',
      nickname: response.nickname,
      legalName: response.legal_name,
      avatarUrl: response.avatar_url,
      mobile: response.mobile,
      email: response.email,
      status: response.status,
      createdAt: response.created_at,
      updatedAt: response.updated_at
    };
    
    helpers.put({
      type: 'save',
      payload: {
        currentUser: response,
        userInfo: userInfo,
        clinic: response?.clinic || state.clinic,
        roles: response?.roles || state.roles
      }
    });
    return userInfo;
  },
  async fetch(_: any, helpers: EffectHelpers = { call, put }): Promise<UserInfo | null> {
    return effects.getUserInfo(_, helpers);
  },
  async fetchCurrent(_: any, helpers: EffectHelpers = { call, put }): Promise<any> {
    // 使用新的 IAM Identity API
    const response = await helpers.call(getMe);
    if (response) {
      helpers.put({ type: 'saveCurrentUser', payload: response });
    }
    return response;
  }
};

/**
 * 运行 Effect
 */
function runEffect(effectName: string, payload?: any): Promise<any> {
  const effect = effects[effectName];
  if (!effect) {
    throw new Error(`[UserStore] 未找到 effect: ${effectName}`);
  }
  return effect(payload, { call, put });
}

/**
 * 获取用户信息
 */
export function getUserInfo(): UserInfo | null {
  return state.userInfo;
}

/**
 * 设置用户信息
 */
export function setUserInfo(info: UserInfo | null): void {
  dispatch('save', { userInfo: info ?? null });
}

/**
 * 检查 UserStore 是否已初始化
 */
export function isUserStoreInitialized(): boolean {
  return state.isInitialized;
}

/**
 * 检查 UserStore 是否正在加载
 */
export function isUserStoreLoading(): boolean {
  return state.isLoading;
}

/**
 * 获取 UserStore 状态
 */
export function getUserStoreState(): UserStoreState {
  return cloneState();
}

/**
 * 重置 UserStore
 */
export function resetUserStore(): void {
  dispatch('reset');
}

/**
 * 订阅 UserStore 变化
 */
export function subscribeUserStore(listener: (state: UserStoreState) => void): () => void {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

/**
 * 初始化 UserStore
 */
export async function initUserStore(force: boolean = false): Promise<UserStoreState> {
  if (state.isInitialized && !force) {
    console.log('[UserStore] 已初始化，跳过重复加载');
    return cloneState();
  }

  if (state.isLoading) {
    console.log('[UserStore] 正在加载中，等待完成...');
    return new Promise<UserStoreState>(resolve => {
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

/**
 * UserModel 对象（保持向后兼容）
 */
const UserModel = {
  namespace,
  get state(): UserStoreState {
    return cloneState();
  },
  reducers,
  effects
};

export default UserModel;

