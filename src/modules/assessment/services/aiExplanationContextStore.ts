import Taro from '@tarojs/taro';
import { PRIVATE_SESSION_PREFIX } from '@/shared/stores/sessionPrivacy';
import { isWorkflowRequestId, isReportId } from '@/services/api/aiExplanationApi';
import type { AIScope } from '@/services/api/aiExplanationApi';

export interface AIAccountScope extends AIScope { accountId: string }
export interface AIPointer extends AIAccountScope {
  schemaVersion: 3; requestId: string; sourceReportId: string; updatedAt: number;
}
const KEY = `${PRIVATE_SESSION_PREFIX}ai-workflow:v3`;
const PREVIOUS_KEY = `${PRIVATE_SESSION_PREFIX}ai-workflow:v2`;
const matches = (a: AIAccountScope, b: AIAccountScope) => a.accountId === b.accountId && a.assessmentId === b.assessmentId && a.testeeId === b.testeeId;
export class AIStorageError extends Error {
  code = 'AI_STORAGE_UNAVAILABLE';
  constructor() { super('暂时无法保存解读请求，请检查设备存储后重试'); }
}
const absent = (raw: unknown) => raw === '' || raw === undefined || raw === null;
function decode(raw: unknown, version: 2 | 3): AIPointer[] {
  if (!Array.isArray(raw)) throw new AIStorageError();
  return raw.map(p => {
    const requestId = p && (version === 2 ? p.generationId : p.requestId);
    if (!p || p.schemaVersion !== version ||
      !['accountId','assessmentId','testeeId'].every(k => typeof p[k] === 'string' && p[k]) ||
      typeof requestId !== 'string' || !isWorkflowRequestId(requestId) ||
      typeof p.sourceReportId !== 'string' || (p.sourceReportId !== '' && !isReportId(p.sourceReportId)) ||
      !Number.isFinite(p.updatedAt)) throw new AIStorageError();
    return { schemaVersion: 3, accountId: p.accountId, assessmentId: p.assessmentId, testeeId: p.testeeId,
      requestId, sourceReportId: p.sourceReportId, updatedAt: p.updatedAt };
  });
}
function writeAll(pointers: AIPointer[]) {
  try {
    Taro.setStorageSync(KEY, pointers);
    const saved = decode(Taro.getStorageSync(KEY), 3);
    if (JSON.stringify(saved) !== JSON.stringify(pointers)) throw new AIStorageError();
  } catch (_) { throw new AIStorageError(); }
}
function readAll(): AIPointer[] {
  try {
    const raw: unknown = Taro.getStorageSync(KEY);
    if (!absent(raw)) return decode(raw, 3);
    const previous: unknown = Taro.getStorageSync(PREVIOUS_KEY);
    if (absent(previous)) return [];
    // Upgrade only the new workflow's v2 UUID pointers; never read old Generation data.
    const upgraded = decode(previous, 2);
    writeAll(upgraded);
    // The verified v3 write is authoritative even if device cleanup fails.
    try { Taro.removeStorageSync(PREVIOUS_KEY); } catch (_) { /* Session logout also removes it. */ }
    return upgraded;
  } catch (_) { throw new AIStorageError(); }
}
export function readAIPointer(scope: AIAccountScope) {
  if (!scope.accountId) return undefined;
  return readAll().find(p => matches(p, scope));
}
export function saveAIPointer(scope: AIAccountScope, requestId: string, sourceReportId = '') {
  if (!scope.accountId || !isWorkflowRequestId(requestId) || sourceReportId && !isReportId(sourceReportId)) throw new AIStorageError();
  const all = readAll();
  const previous = all.find(p => matches(p, scope) && p.requestId === requestId);
  // Only command metadata is retained. Unresolved requests must not expire or be evicted.
  const pointer: AIPointer = { schemaVersion: 3, accountId: scope.accountId, assessmentId: scope.assessmentId, testeeId: scope.testeeId,
    requestId, sourceReportId: sourceReportId || previous?.sourceReportId || '', updatedAt: Date.now() };
  writeAll([pointer, ...all.filter(p => !matches(p, scope))]);
  const saved = readAIPointer(scope);
  if (saved?.requestId !== requestId || saved.sourceReportId !== pointer.sourceReportId) throw new AIStorageError();
}
export function removeAIPointer(scope: AIAccountScope) { writeAll(readAll().filter(p => !matches(p, scope))); }
export function removeAIAccountPointers(accountId: string) {
  try { writeAll(readAll().filter(p => p.accountId !== accountId)); } catch (_) { /* Account invalidation must proceed even if device storage fails. */ }
}

// Separate request metadata: a 429 can happen before a request ID exists.
const COOLDOWN_KEY = `${PRIVATE_SESSION_PREFIX}ai-explanation:cooldown:v1`;
interface Cooldown extends AIAccountScope { retryAt: number }
function readCooldowns(): Cooldown[] {
  try {
    const raw: unknown = Taro.getStorageSync(COOLDOWN_KEY);
    return Array.isArray(raw) ? raw.filter((p): p is Cooldown => !!p &&
      ['accountId','assessmentId','testeeId'].every(k => typeof p[k] === 'string') &&
      Number.isFinite(p.retryAt) && p.retryAt > Date.now()).slice(0, 30) : [];
  } catch (_) { return []; }
}
export function readAIRetryAt(scope: AIAccountScope): number { return readCooldowns().find(p => matches(p, scope))?.retryAt || 0; }
export function saveAIRetryAt(scope: AIAccountScope, retryAt: number) {
  const next = { accountId: scope.accountId, assessmentId: scope.assessmentId, testeeId: scope.testeeId, retryAt };
  try { Taro.setStorageSync(COOLDOWN_KEY, [next, ...readCooldowns().filter(p => !matches(p, scope))].slice(0, 30)); } catch (_) { /* Current controller still honors the deadline. */ }
}
