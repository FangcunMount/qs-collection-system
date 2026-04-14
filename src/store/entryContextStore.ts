import Taro from '@tarojs/taro';

export interface EntryContext {
  mpqrcodeid?: string;
  task_id?: string;
  token?: string;
  plan_name?: string;
  clinician_name?: string;
  clinician_title?: string;
  clinician_avatar?: string;
  entry_title?: string;
  entry_description?: string;
  entry_status?: string;
  target_type?: string;
  target_code?: string;
  q?: string;
  t?: string;
  signid?: string;
  updatedAt?: number;
  raw?: Record<string, any>;
}

type Listener = (state: EntryContext | null) => void;

const STORAGE_KEY = 'entry_context_store';

let state: EntryContext | null = null;
const listeners = new Set<Listener>();

function cloneState(): EntryContext | null {
  return state ? { ...state, raw: state.raw ? { ...state.raw } : undefined } : null;
}

function notify(): void {
  const snapshot = cloneState();
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[EntryContextStore] listener failed:', error);
    }
  });
}

function saveToStorage(): void {
  try {
    if (!state) {
      Taro.removeStorageSync(STORAGE_KEY);
      return;
    }
    Taro.setStorageSync(STORAGE_KEY, state);
  } catch (error) {
    console.error('[EntryContextStore] save failed:', error);
  }
}

function loadFromStorage(): void {
  try {
    const stored = Taro.getStorageSync<EntryContext>(STORAGE_KEY);
    if (stored) {
      state = stored;
    }
  } catch (error) {
    console.error('[EntryContextStore] load failed:', error);
  }
}

loadFromStorage();

export function getEntryContext(): EntryContext | null {
  return cloneState();
}

export function setEntryContext(input: Record<string, any> | null | undefined): void {
  if (!input) {
    state = null;
    saveToStorage();
    notify();
    return;
  }

  state = {
    mpqrcodeid: input.mpqrcodeid ? String(input.mpqrcodeid) : undefined,
    task_id: input.task_id ? String(input.task_id) : undefined,
    token: input.token ? String(input.token) : undefined,
    plan_name: input.plan_name || input.planName || '',
    clinician_name: input.clinician_name || input.clinicianName || '',
    clinician_title: input.clinician_title || input.clinicianTitle || '',
    clinician_avatar: input.clinician_avatar || input.clinicianAvatar || '',
    entry_title: input.entry_title || input.entryTitle || '',
    entry_description: input.entry_description || input.entryDescription || '',
    entry_status: input.entry_status || input.entryStatus || '',
    target_type: input.target_type || input.targetType || '',
    target_code: input.target_code || input.targetCode || '',
    q: input.q ? String(input.q) : undefined,
    t: input.t ? String(input.t) : undefined,
    signid: input.signid ? String(input.signid) : undefined,
    updatedAt: Date.now(),
    raw: { ...input }
  };
  saveToStorage();
  notify();
}

export function clearEntryContext(): void {
  state = null;
  saveToStorage();
  notify();
}

export function subscribeEntryContext(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
