import Taro from '@tarojs/taro';

/**
 * 受试者基本信息
 */
export interface Testee {
  /** 受试者ID */
  id: string;
  /** 法定姓名 */
  legalName: string;
  /** 性别 (1=男, 2=女, 0=未知) */
  gender?: number;
  /** 出生日期 (YYYY-MM-DD) */
  dob: string;
  /** 证件类型 */
  idType?: string;
  /** 证件号码 */
  idNo?: string;
  /** 脱敏后的证件号码 */
  idMasked?: string;
  /** 关系 (parent/guardian/self) */
  relation?: string;
  /** 身高 (厘米) */
  heightCm?: number | null;
  /** 体重 (千克) */
  weightKg?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 受试者输入类型（兼容多种格式）
 */
export type TesteeInput = Partial<Testee> & {
  id?: string | number;
  childid?: string | number;
  testeeid?: string | number;
  name?: string;
  legal_name?: string;
  testee_name?: string;
  sex?: string | number;
  birthday?: string;
};

/**
 * TesteeStore 状态
 */
export interface TesteeStoreState {
  /** 受试者列表 */
  testeeList: Testee[];
  /** 当前选中的受试者ID */
  selectedTesteeId: string;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 最后更新时间 */
  lastUpdated: number | null;
}

/**
 * 监听器函数类型
 */
type Listener = (state: TesteeStoreState) => void;

const STORAGE_KEY = 'testee_store';

/** 当前状态 */
const state: TesteeStoreState = {
  testeeList: [],
  selectedTesteeId: '',
  isInitialized: false,
  isLoading: false,
  lastUpdated: null
};

/** 监听器集合 */
const listeners = new Set<Listener>();

/**
 * 克隆当前状态
 */
const cloneState = (): TesteeStoreState => ({
  testeeList: state.testeeList.map(item => ({ ...item })),
  selectedTesteeId: state.selectedTesteeId,
  isInitialized: state.isInitialized,
  isLoading: state.isLoading,
  lastUpdated: state.lastUpdated
});

/**
 * 通知所有监听器
 */
function notify(): void {
  const snapshot = cloneState();
  listeners.forEach(listener => listener(snapshot));
}

/**
 * 保存状态到本地存储
 */
function saveToStorage(): void {
  try {
    const data = {
      testeeList: state.testeeList,
      selectedTesteeId: state.selectedTesteeId,
      lastUpdated: state.lastUpdated
    };
    Taro.setStorageSync(STORAGE_KEY, data);
    console.log('[TesteeStore] 状态已保存到本地存储');
  } catch (e) {
    console.error('[TesteeStore] 保存到本地存储失败:', e);
  }
}

/**
 * 从本地存储加载状态
 */
function loadFromStorage(): Partial<TesteeStoreState> | null {
  try {
    const stored = Taro.getStorageSync<any>(STORAGE_KEY);
    if (!stored) return null;
    return stored;
  } catch (e) {
    console.error('[TesteeStore] 从本地存储加载失败:', e);
    return null;
  }
}

/**
 * 规范化受试者数据
 */
function normalizeTestee(testee: TesteeInput): Testee | null {
  if (!testee) {
    console.log('[TesteeStore] normalizeTestee: testee 为空');
    return null;
  }

  // 兼容多种 ID 字段
  const id = testee.id ?? testee.testeeid ?? testee.childid;
  if (!id) {
    console.log('[TesteeStore] normalizeTestee: 缺少 ID', testee);
    return null;
  }

  // 兼容多种姓名字段（包括下划线和驼峰格式）
  const legalName = testee.legalName ?? (testee as any).legal_name ?? testee.name ?? testee.testee_name ?? '';
  
  console.log('[TesteeStore] normalizeTestee 处理中:', { 
    id, 
    legalName,
    raw: { 
      legalName: testee.legalName, 
      legal_name: (testee as any).legal_name,
      name: testee.name 
    }
  });

  // 兼容多种性别字段
  let gender: number | undefined;
  if (testee.gender !== undefined) {
    gender = typeof testee.gender === 'number' ? testee.gender : parseInt(String(testee.gender));
  } else if (testee.sex !== undefined) {
    gender = typeof testee.sex === 'number' ? testee.sex : parseInt(String(testee.sex));
  }

  // 兼容多种日期字段
  const dob = testee.dob ?? testee.birthday ?? '';

  const result = {
    id: String(id),
    legalName,
    gender,
    dob,
    idType: testee.idType,
    idNo: testee.idNo,
    idMasked: testee.idMasked,
    relation: testee.relation,
    heightCm: testee.heightCm,
    weightKg: testee.weightKg,
    createdAt: testee.createdAt,
    updatedAt: testee.updatedAt
  };
  
  console.log('[TesteeStore] normalizeTestee 结果:', result);
  return result;
}

/**
 * 获取受试者列表
 */
export function getTesteeList(): Testee[] {
  return [...state.testeeList];
}

/**
 * 设置受试者列表
 */
export function setTesteeList(list: TesteeInput[] = []): void {
  console.log('[TesteeStore] setTesteeList 收到数据:', list);
  const normalized = Array.isArray(list)
    ? list.map(normalizeTestee).filter((item): item is Testee => item !== null)
    : [];
  
  console.log('[TesteeStore] 规范化后的数据:', normalized);
  state.testeeList = normalized;
  state.lastUpdated = Date.now();

  // 自动选择第一个受试者（如果当前没有选中或选中的不存在）
  if (normalized.length > 0) {
    const hasSelected = normalized.some(item => item.id === state.selectedTesteeId);
    if (!hasSelected) {
      state.selectedTesteeId = normalized[0].id;
    }
  } else {
    state.selectedTesteeId = '';
  }

  saveToStorage();
  notify();
  
  console.log('[TesteeStore] 受试者列表已更新，共', normalized.length, '个');
}

/**
 * 添加受试者
 */
export function addTestee(testee: TesteeInput): void {
  const normalized = normalizeTestee(testee);
  if (!normalized) {
    console.warn('[TesteeStore] 无效的受试者数据:', testee);
    return;
  }

  // 检查是否已存在，存在则更新
  const existingIndex = state.testeeList.findIndex(item => item.id === normalized.id);
  if (existingIndex > -1) {
    state.testeeList[existingIndex] = normalized;
    console.log('[TesteeStore] 受试者已更新:', normalized.legalName);
  } else {
    state.testeeList = [...state.testeeList, normalized];
    console.log('[TesteeStore] 受试者已添加:', normalized.legalName);
  }

  // 如果没有选中的受试者，自动选中新添加的
  if (!state.selectedTesteeId) {
    state.selectedTesteeId = normalized.id;
  }

  state.lastUpdated = Date.now();
  saveToStorage();
  notify();
}

/**
 * 更新受试者信息
 */
export function updateTestee(testeeId: string, updates: Partial<TesteeInput>): void {
  const id = String(testeeId);
  const index = state.testeeList.findIndex(item => item.id === id);
  
  if (index === -1) {
    console.warn('[TesteeStore] 未找到受试者:', testeeId);
    return;
  }

  const updated = {
    ...state.testeeList[index],
    ...updates,
    id, // 保持 ID 不变
    updatedAt: new Date().toISOString()
  };

  state.testeeList[index] = updated;
  state.lastUpdated = Date.now();
  saveToStorage();
  notify();
  
  console.log('[TesteeStore] 受试者已更新:', updated.legalName);
}

/**
 * 删除受试者
 */
export function removeTestee(testeeId: string | number): void {
  const id = String(testeeId);
  const originalLength = state.testeeList.length;
  
  state.testeeList = state.testeeList.filter(item => item.id !== id);

  if (state.testeeList.length < originalLength) {
    console.log('[TesteeStore] 受试者已删除:', id);
    
    // 如果删除的是当前选中的，自动选择第一个
    if (state.selectedTesteeId === id) {
      state.selectedTesteeId = state.testeeList.length > 0 ? state.testeeList[0].id : '';
    }

    state.lastUpdated = Date.now();
    saveToStorage();
    notify();
  } else {
    console.warn('[TesteeStore] 未找到要删除的受试者:', id);
  }
}

/**
 * 获取当前选中的受试者ID
 */
export function getSelectedTesteeId(): string {
  return state.selectedTesteeId;
}

/**
 * 获取当前选中的受试者
 */
export function getSelectedTestee(): Testee | null {
  if (!state.selectedTesteeId) return null;
  return state.testeeList.find(item => item.id === state.selectedTesteeId) || null;
}

/**
 * 设置当前选中的受试者
 */
export function setSelectedTesteeId(testeeId: string | number | null): void {
  const id = testeeId ? String(testeeId) : '';
  
  // 验证受试者是否存在
  if (id) {
    const exists = state.testeeList.some(item => item.id === id);
    if (!exists) {
      console.warn('[TesteeStore] 受试者不存在:', id);
      // 如果列表不为空，选择第一个
      if (state.testeeList.length > 0) {
        state.selectedTesteeId = state.testeeList[0].id;
      } else {
        state.selectedTesteeId = '';
      }
    } else {
      state.selectedTesteeId = id;
    }
  } else {
    state.selectedTesteeId = '';
  }

  saveToStorage();
  notify();
  
  console.log('[TesteeStore] 已选中受试者:', state.selectedTesteeId);
}

/**
 * 根据ID查找受试者
 */
export function findTesteeById(testeeId: string | number): Testee | null {
  const id = String(testeeId);
  return state.testeeList.find(item => item.id === id) || null;
}

/**
 * 检查受试者是否存在
 */
export function hasTestee(testeeId: string | number): boolean {
  const id = String(testeeId);
  return state.testeeList.some(item => item.id === id);
}

/**
 * 获取受试者数量
 */
export function getTesteeCount(): number {
  return state.testeeList.length;
}

/**
 * 检查是否已初始化
 */
export function isTesteeStoreInitialized(): boolean {
  return state.isInitialized;
}

/**
 * 检查是否正在加载
 */
export function isTesteeStoreLoading(): boolean {
  return state.isLoading;
}

/**
 * 获取当前状态快照
 */
export function getTesteeStoreState(): TesteeStoreState {
  return cloneState();
}

/**
 * 重置 TesteeStore
 */
export function resetTesteeStore(): void {
  state.testeeList = [];
  state.selectedTesteeId = '';
  state.isInitialized = false;
  state.isLoading = false;
  state.lastUpdated = null;
  
  try {
    Taro.removeStorageSync(STORAGE_KEY);
  } catch (e) {
    console.error('[TesteeStore] 清除本地存储失败:', e);
  }
  
  notify();
  console.log('[TesteeStore] 已重置');
}

/**
 * 订阅状态变化
 */
export function subscribeTesteeStore(listener: Listener): () => void {
  if (typeof listener !== 'function') {
    console.warn('[TesteeStore] 无效的监听器');
    return () => {};
  }
  
  listeners.add(listener);
  // 立即调用一次，传递当前状态
  listener(cloneState());
  
  // 返回取消订阅函数
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 从 IAM 加载儿童列表
 */
export async function loadChildrenFromIAM(): Promise<Testee[]> {
  console.log('[TesteeStore] 从 IAM 加载儿童列表');
  
  try {
    const { getMyChildren } = await import('../services/api/iamIdentityApi');
    const response = await getMyChildren();
    console.log('[TesteeStore] IAM 响应:', response);
    
    // 转换 IAM children 格式到 testee 格式
    const children = response?.items || [];
    const testees = children.map((child: any) => ({
      id: String(child.id),
      legalName: child.legal_name || '',
      gender: child.gender,
      dob: child.dob || '',
      idType: child.id_type,
      idNo: child.id_no,
      idMasked: child.id_masked,
      relation: child.relation,
      heightCm: child.height_cm,
      weightKg: child.weight_kg,
      createdAt: child.created_at,
      updatedAt: child.updated_at
    }));
    
    console.log('[TesteeStore] 从 IAM 加载了', testees.length, '个儿童');
    return testees;
  } catch (error) {
    console.error('[TesteeStore] 从 IAM 加载儿童失败:', error);
    throw error;
  }
}

/**
 * 从 Collection 加载受试者列表
 */
export async function loadTesteesFromCollection(): Promise<Testee[]> {
  console.log('[TesteeStore] 从 Collection 加载受试者列表');
  
  try {
    const { getMyTestees } = await import('../services/api/testeeApi');
    const response = await getMyTestees();
    console.log('[TesteeStore] Collection 响应:', response);
    
    const testees = response?.items || [];
    console.log('[TesteeStore] 从 Collection 加载了', testees.length, '个受试者');
    return testees;
  } catch (error) {
    console.error('[TesteeStore] 从 Collection 加载受试者失败:', error);
    throw error;
  }
}

/**
 * 初始化 TesteeStore
 * 优先从 IAM 加载儿童列表，如果失败则尝试旧接口
 */
export async function initTesteeStore(force: boolean = false): Promise<TesteeStoreState> {
  // 如果已初始化且不强制刷新，直接返回
  if (state.isInitialized && !force) {
    console.log('[TesteeStore] 已初始化，跳过重复加载');
    return cloneState();
  }

  // 如果正在加载，等待完成
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
    // 先尝试从本地存储加载
    const stored = loadFromStorage();
    if (stored && !force) {
      console.log('[TesteeStore] 从本地存储加载');
      if (stored.testeeList) {
        state.testeeList = stored.testeeList;
      }
      if (stored.selectedTesteeId) {
        state.selectedTesteeId = stored.selectedTesteeId;
      }
      if (stored.lastUpdated) {
        state.lastUpdated = stored.lastUpdated;
      }
    }

    // 从服务器加载最新数据
    let list: Testee[] = [];
    
    try {
      // 使用新的 IAM API 加载儿童列表
      console.log('[TesteeStore] 从 IAM 加载儿童列表');
      list = await loadChildrenFromIAM();
    } catch (iamError) {
      console.error('[TesteeStore] IAM 加载失败:', iamError);
      throw iamError;
    }
    
    console.log('[TesteeStore] 解析后的列表长度:', list.length);
    setTesteeList(list);
    
    state.isInitialized = true;
    console.log('[TesteeStore] 初始化成功，共', list.length, '个受试者');
    
  } catch (error) {
    console.error('[TesteeStore] 初始化失败:', error);
    
    // 如果有本地数据，使用本地数据
    if (state.testeeList.length === 0) {
      const stored = loadFromStorage();
      if (stored?.testeeList) {
        state.testeeList = stored.testeeList;
        if (stored.selectedTesteeId) {
          state.selectedTesteeId = stored.selectedTesteeId;
        }
        console.log('[TesteeStore] 使用本地缓存数据');
      }
    }
    
    state.isInitialized = false;
  } finally {
    state.isLoading = false;
    notify();
  }

  const result = cloneState();
  console.log('[TesteeStore] 初始化完成:', result);
  return result;
}

/**
 * 刷新受试者列表
 */
export async function refreshTesteeList(): Promise<void> {
  console.log('[TesteeStore] 刷新受试者列表');
  await initTesteeStore(true);
}

/**
 * TesteeStore 对象（包含所有导出的方法）
 */
const TesteeStore = {
  // 列表操作
  getTesteeList,
  setTesteeList,
  addTestee,
  updateTestee,
  removeTestee,
  
  // 选择操作
  getSelectedTesteeId,
  getSelectedTestee,
  setSelectedTesteeId,
  
  // 查询操作
  findTesteeById,
  hasTestee,
  getTesteeCount,
  
  // 状态管理
  isTesteeStoreInitialized,
  isTesteeStoreLoading,
  getTesteeStoreState,
  resetTesteeStore,
  
  // 订阅
  subscribeTesteeStore,
  
  // 初始化
  initTesteeStore,
  refreshTesteeList,
  
  // IAM & Collection 集成
  loadChildrenFromIAM,
  loadTesteesFromCollection
};

export default TesteeStore;
