import Taro from '@tarojs/taro';

/**
 * Token 数据结构
 */
export interface TokenData {
  /** 访问令牌（JWT） */
  access_token: string;
  /** 刷新令牌（UUID） */
  refresh_token: string | null;
  /** Token 类型（通常是 "Bearer"） */
  token_type: string;
  /** access_token 过期时间（秒，如 899） */
  expires_in?: number;
  /** 创建时间戳（本地添加） */
  created_at: number;
  /** 更新时间戳（本地添加） */
  updated_at: number;
}

/**
 * Token Store 状态
 */
export interface TokenStoreState {
  /** Token 数据 */
  tokenData: TokenData | null;
  /** 是否正在刷新 Token */
  isRefreshing: boolean;
  /** 刷新 Promise（用于防止并发刷新） */
  refreshPromise: Promise<string> | null;
}

/**
 * Token 输入类型（支持多种格式）
 */
type TokenInput = string | Partial<TokenData> | TokenData;

/**
 * 监听器函数类型
 */
type Listener = (state: TokenStoreState) => void;

const STORAGE_KEY = 'token';

/** 当前状态 */
const state: TokenStoreState = {
  tokenData: null,
  isRefreshing: false,
  refreshPromise: null
};

/** 监听器集合 */
const listeners = new Set<Listener>();

/**
 * 克隆当前状态
 */
const cloneState = (): TokenStoreState => ({
  tokenData: state.tokenData ? { ...state.tokenData } : null,
  isRefreshing: state.isRefreshing,
  refreshPromise: state.refreshPromise
});

/**
 * 通知所有监听器
 */
function notify(): void {
  const snapshot = cloneState();
  listeners.forEach(listener => listener(snapshot));
}

/**
 * 规范化 Token 数据
 * @param token - 原始 token 数据
 * @param refreshToken - 可选的 refresh_token
 * @returns 规范化的 TokenData 或 null
 */
function normalizeTokenData(token: TokenInput, refreshToken?: string): TokenData | null {
  // 如果已经是规范格式的对象
  if (typeof token === 'object' && token !== null && 'access_token' in token) {
    return {
      access_token: token.access_token!,
      refresh_token: token.refresh_token ?? refreshToken ?? null,
      token_type: token.token_type ?? 'Bearer',
      expires_in: token.expires_in,
      created_at: token.created_at ?? Date.now(),
      updated_at: token.updated_at ?? Date.now()
    };
  }
  
  // 如果是字符串（兼容旧格式）
  if (typeof token === 'string') {
    return {
      access_token: token,
      refresh_token: refreshToken ?? null,
      token_type: 'Bearer',
      expires_in: undefined,
      created_at: Date.now(),
      updated_at: Date.now()
    };
  }
  
  return null;
}

/**
 * 从本地存储加载 Token
 * @returns TokenData 或 null
 */
function loadFromStorage(): TokenData | null {
  try {
    const stored = Taro.getStorageSync<TokenInput>(STORAGE_KEY);
    if (!stored) return null;

    return normalizeTokenData(stored);
  } catch (e) {
    console.error('[TokenStore] 从本地存储加载失败:', e);
    return null;
  }
}

/**
 * 保存 Token 到本地存储
 * @param tokenData - Token 数据
 */
function saveToStorage(tokenData: TokenData): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, tokenData);
    console.log('[TokenStore] Token 已保存到本地存储');
  } catch (e) {
    console.error('[TokenStore] 保存到本地存储失败:', e);
  }
}

/**
 * 获取 access_token
 * @returns access_token 或 null
 */
export function getAccessToken(): string | null {
  // 优先从内存获取
  if (state.tokenData?.access_token) {
    return state.tokenData.access_token;
  }

  // 从本地存储加载
  const stored = loadFromStorage();
  if (stored?.access_token) {
    state.tokenData = stored;
    notify();
    return stored.access_token;
  }

  return null;
}

/**
 * 获取 refresh_token
 * @returns refresh_token 或 null
 */
export function getRefreshToken(): string | null {
  if (state.tokenData?.refresh_token) {
    return state.tokenData.refresh_token;
  }

  const stored = loadFromStorage();
  if (stored?.refresh_token) {
    state.tokenData = stored;
    notify();
    return stored.refresh_token;
  }

  return null;
}

/**
 * 获取完整的 Token 数据
 * @returns TokenData 或 null
 */
export function getTokenData(): TokenData | null {
  if (state.tokenData) {
    return { ...state.tokenData };
  }

  const stored = loadFromStorage();
  if (stored) {
    state.tokenData = stored;
    notify();
    return { ...stored };
  }

  return null;
}

/**
 * 设置 Token 数据
 * @param token - Token 字符串或完整的 TokenData 对象
 * @param refreshToken - 可选的 refresh_token（当第一个参数是字符串时使用）
 */
export function setToken(token: TokenInput, refreshToken?: string): void {
  if (!token) {
    console.warn('[TokenStore] 尝试设置空 token');
    return;
  }

  const tokenData = normalizeTokenData(token, refreshToken);
  if (!tokenData) {
    console.error('[TokenStore] 无效的 token 格式:', token);
    return;
  }

  // 保留旧的 created_at
  if (state.tokenData?.created_at && !('created_at' in (token as object))) {
    tokenData.created_at = state.tokenData.created_at;
  }

  state.tokenData = tokenData;
  saveToStorage(tokenData);
  notify();

  console.log('[TokenStore] Token 已更新', {
    hasAccessToken: !!tokenData.access_token,
    hasRefreshToken: !!tokenData.refresh_token,
    tokenType: tokenData.token_type,
    expiresIn: tokenData.expires_in
  });
}

/**
 * 更新 access_token（刷新后使用）
 * @param newAccessToken - 新的 access_token
 * @param newRefreshToken - 可选的新 refresh_token
 */
export function updateAccessToken(newAccessToken: string, newRefreshToken?: string): void {
  if (!state.tokenData) {
    setToken(newAccessToken, newRefreshToken);
    return;
  }

  state.tokenData = {
    ...state.tokenData,
    access_token: newAccessToken,
    refresh_token: newRefreshToken ?? state.tokenData.refresh_token,
    updated_at: Date.now()
  };

  saveToStorage(state.tokenData);
  notify();

  console.log('[TokenStore] Access token 已更新');
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  state.tokenData = null;
  state.isRefreshing = false;
  state.refreshPromise = null;

  try {
    Taro.removeStorageSync(STORAGE_KEY);
    console.log('[TokenStore] Token 已清除');
  } catch (e) {
    console.error('[TokenStore] 清除 token 失败:', e);
  }

  notify();
}

/**
 * 检查 Token 是否存在
 * @returns 是否存在 token
 */
export function hasToken(): boolean {
  return !!getAccessToken();
}

/**
 * 检查 Token 是否过期（需要后端返回 expires_in）
 * @param advanceTime - 提前判定时间（毫秒），默认 5 分钟
 * @returns 是否过期
 */
export function isTokenExpired(advanceTime: number = 5 * 60 * 1000): boolean {
  const tokenData = getTokenData();
  if (!tokenData || !tokenData.expires_in) {
    return false; // 无法判断，假设未过期
  }

  const now = Date.now();
  const expireTime = (tokenData.updated_at || tokenData.created_at) + tokenData.expires_in * 1000;
  
  return now >= expireTime - advanceTime;
}

/**
 * 获取 Token 剩余有效时间（毫秒）
 * @returns 剩余时间（毫秒），如果无法判断返回 null
 */
export function getTokenRemainingTime(): number | null {
  const tokenData = getTokenData();
  if (!tokenData || !tokenData.expires_in) {
    return null;
  }

  const now = Date.now();
  const expireTime = (tokenData.updated_at || tokenData.created_at) + tokenData.expires_in * 1000;
  const remaining = expireTime - now;
  
  return remaining > 0 ? remaining : 0;
}

/**
 * 刷新状态
 */
export interface RefreshingState {
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
}

/**
 * 设置刷新状态
 * @param isRefreshing - 是否正在刷新
 * @param promise - 刷新 Promise
 */
export function setRefreshingState(isRefreshing: boolean, promise: Promise<string> | null = null): void {
  state.isRefreshing = isRefreshing;
  state.refreshPromise = promise;
  notify();
}

/**
 * 获取刷新状态
 * @returns 刷新状态
 */
export function getRefreshingState(): RefreshingState {
  return {
    isRefreshing: state.isRefreshing,
    refreshPromise: state.refreshPromise
  };
}

/**
 * 订阅 Token 变化
 * @param listener - 监听器函数
 * @returns 取消订阅函数
 */
export function subscribeTokenStore(listener: Listener): () => void {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  listener(cloneState());
  return () => listeners.delete(listener);
}

/**
 * 获取当前状态快照
 * @returns 当前状态
 */
export function getTokenStoreState(): TokenStoreState {
  return cloneState();
}

/**
 * 初始化 Token Store（从本地存储加载）
 */
export function initTokenStore(): void {
  // 加载存储的 token
  const stored = loadFromStorage();
  if (stored) {
    state.tokenData = stored;
    console.log('[TokenStore] 已从本地存储加载 token');
    notify();
  } else {
    console.log('[TokenStore] 本地存储中无 token');
  }
}

/**
 * TokenStore 对象（包含所有导出的方法）
 */
const TokenStore = {
  getAccessToken,
  getRefreshToken,
  getTokenData,
  setToken,
  updateAccessToken,
  clearToken,
  hasToken,
  isTokenExpired,
  getTokenRemainingTime,
  setRefreshingState,
  getRefreshingState,
  subscribeTokenStore,
  getTokenStoreState,
  initTokenStore
};

export default TokenStore;
