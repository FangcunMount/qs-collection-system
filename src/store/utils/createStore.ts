/**
 * Store 工具函数
 * 提供统一的 store 创建模式，减少代码重复
 */

/**
 * Store 配置接口
 */
export interface StoreConfig<TState> {
  /** Store 名称（用于日志） */
  name: string;
  /** 初始状态 */
  initialState: TState;
  /** 本地存储键名（可选） */
  storageKey?: string;
}

/**
 * Store API 接口
 */
export interface StoreAPI<TState> {
  /** 获取当前状态 */
  getState(): TState;
  /** 设置状态 */
  setState(updater: TState | ((prev: TState) => TState)): void;
  /** 重置状态 */
  reset(): void;
  /** 订阅状态变化 */
  subscribe(listener: (state: TState) => void): () => void;
  /** 从本地存储加载 */
  loadFromStorage(): Partial<TState> | null;
  /** 保存到本地存储 */
  saveToStorage(): void;
}

/**
 * 创建 Store
 * @param config Store 配置
 * @returns Store API
 */
export function createStore<TState extends Record<string, any>>(
  config: StoreConfig<TState>
): StoreAPI<TState> {
  const { name, initialState, storageKey } = config;
  
  let state: TState = { ...initialState };
  const listeners = new Set<(state: TState) => void>();

  /**
   * 克隆状态
   */
  const cloneState = (): TState => {
    const cloned: any = {};
    for (const key in state) {
      const value = state[key];
      if (Array.isArray(value)) {
        cloned[key] = [...value];
      } else if (value && typeof value === 'object') {
        cloned[key] = { ...value };
      } else {
        cloned[key] = value;
      }
    }
    return cloned as TState;
  };

  /**
   * 通知所有监听器
   */
  const notify = () => {
    const snapshot = cloneState();
    listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error(`[${name}] 监听器执行失败:`, error);
      }
    });
  };

  /**
   * 获取当前状态
   */
  const getState = (): TState => {
    return cloneState();
  };

  /**
   * 设置状态
   */
  const setState = (updater: TState | ((prev: TState) => TState)): void => {
    if (typeof updater === 'function') {
      state = (updater as (prev: TState) => TState)(state);
    } else {
      state = { ...state, ...updater };
    }
    notify();
    
    // 自动保存到本地存储
    if (storageKey) {
      saveToStorage();
    }
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    state = { ...initialState };
    notify();
    
    if (storageKey) {
      try {
        const Taro = require('@tarojs/taro');
        Taro.removeStorageSync(storageKey);
      } catch (e) {
        console.error(`[${name}] 清除本地存储失败:`, e);
      }
    }
  };

  /**
   * 订阅状态变化
   */
  const subscribe = (listener: (state: TState) => void): (() => void) => {
    if (typeof listener !== 'function') {
      console.warn(`[${name}] 无效的监听器`);
      return () => {};
    }
    
    listeners.add(listener);
    // 立即调用一次，传递当前状态
    listener(cloneState());
    
    // 返回取消订阅函数
    return () => {
      listeners.delete(listener);
    };
  };

  /**
   * 从本地存储加载
   */
  const loadFromStorage = (): Partial<TState> | null => {
    if (!storageKey) return null;
    
    try {
      const Taro = require('@tarojs/taro');
      const stored = Taro.getStorageSync(storageKey);
      if (!stored) return null;
      return stored;
    } catch (e) {
      console.error(`[${name}] 从本地存储加载失败:`, e);
      return null;
    }
  };

  /**
   * 保存到本地存储
   */
  const saveToStorage = (): void => {
    if (!storageKey) return;
    
    try {
      const Taro = require('@tarojs/taro');
      Taro.setStorageSync(storageKey, state);
    } catch (e) {
      console.error(`[${name}] 保存到本地存储失败:`, e);
    }
  };

  return {
    getState,
    setState,
    reset,
    subscribe,
    loadFromStorage,
    saveToStorage
  };
}

