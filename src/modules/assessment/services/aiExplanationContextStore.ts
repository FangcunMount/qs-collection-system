import Taro from '@tarojs/taro';
import { PRIVATE_SESSION_PREFIX } from '@/shared/stores/sessionPrivacy';
import { isWorkflowRequestId, isReportId } from '@/services/api/aiExplanationApi';
import type { AIScope } from '@/services/api/aiExplanationApi';

export interface AIAccountScope extends AIScope { accountId: string }
export interface AIPointer extends AIAccountScope {
  schemaVersion: 2; generationId: string; sourceReportId: string; updatedAt: number;
}
const KEY = `${PRIVATE_SESSION_PREFIX}ai-workflow:v2`;
const matches = (a: AIAccountScope, b: AIAccountScope) => a.accountId === b.accountId && a.assessmentId === b.assessmentId && a.testeeId === b.testeeId;
export class AIStorageError extends Error {
  code = 'AI_STORAGE_UNAVAILABLE';
  constructor() { super('暂时无法保存解读请求，请检查设备存储后重试'); }
}
function readAll(): AIPointer[] {
  try {
    const raw: unknown = Taro.getStorageSync(KEY);
    if (raw === '' || raw === undefined || raw === null) return [];
    if (!Array.isArray(raw) || !raw.every(p => !!p && p.schemaVersion === 2 &&
      ['accountId','assessmentId','testeeId'].every(k => typeof p[k] === 'string' && p[k]) &&
      typeof p.generationId === 'string' && isWorkflowRequestId(p.generationId) &&
      typeof p.sourceReportId === 'string' && (p.sourceReportId === '' || isReportId(p.sourceReportId)) && Number.isFinite(p.updatedAt))) throw new AIStorageError();
    return raw;
  } catch (_) { throw new AIStorageError(); }
}
function writeAll(pointers: AIPointer[]) {
  try { Taro.setStorageSync(KEY, pointers); } catch (_) { throw new AIStorageError(); }
}
export function readAIPointer(scope: AIAccountScope) {
  if (!scope.accountId) return undefined;
  return readAll().find(p => matches(p, scope));
}
export function saveAIPointer(scope: AIAccountScope, generationId: string, sourceReportId = '') {
  if (!scope.accountId || !isWorkflowRequestId(generationId) || sourceReportId && !isReportId(sourceReportId)) throw new AIStorageError();
  const all = readAll();
  const previous = all.find(p => matches(p, scope) && p.generationId === generationId);
  // Only command metadata is retained. Unresolved requests must not expire or be evicted.
  const pointer: AIPointer = { schemaVersion: 2, accountId: scope.accountId, assessmentId: scope.assessmentId, testeeId: scope.testeeId,
    generationId, sourceReportId: sourceReportId || previous?.sourceReportId || '', updatedAt: Date.now() };
  writeAll([pointer, ...all.filter(p => !matches(p, scope))]);
  const saved = readAIPointer(scope);
  if (saved?.generationId !== generationId || saved.sourceReportId !== pointer.sourceReportId) throw new AIStorageError();
}
export function removeAIPointer(scope: AIAccountScope) { writeAll(readAll().filter(p => !matches(p, scope))); }
export function removeAIAccountPointers(accountId: string) {
  try { writeAll(readAll().filter(p => p.accountId !== accountId)); } catch (_) { /* Account invalidation must proceed even if device storage fails. */ }
}

// Separate request metadata: a 429 can happen before a generation ID exists.
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
