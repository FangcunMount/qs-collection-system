import Taro from '@tarojs/taro';
import { PRIVATE_SESSION_PREFIX } from '@/shared/stores/sessionPrivacy';
import type { AIScope } from '@/services/api/aiExplanationApi';

export interface AIAccountScope extends AIScope { accountId: string }
export interface AIPointer extends AIAccountScope {
  schemaVersion: 1; locale: 'zh-CN'; focusAreas: string[];
  generationId: string; sourceReportId: string; updatedAt: number;
}
const KEY = `${PRIVATE_SESSION_PREFIX}ai-explanation:v1`;
const TTL = 7 * 24 * 60 * 60 * 1000;
const matches = (a: AIAccountScope, b: AIAccountScope) => a.accountId === b.accountId && a.assessmentId === b.assessmentId && a.testeeId === b.testeeId;
function readAll(): AIPointer[] {
  try {
    const raw: unknown = Taro.getStorageSync(KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter((p): p is AIPointer => !!p && p.schemaVersion === 1 && p.locale === 'zh-CN' &&
      Array.isArray(p.focusAreas) && p.focusAreas.length === 0 && ['accountId','assessmentId','testeeId','generationId'].every(k => typeof p[k] === 'string' && p[k]) &&
      typeof p.sourceReportId === 'string' && typeof p.updatedAt === 'number' && p.updatedAt <= Date.now() && Date.now() - p.updatedAt < TTL).slice(0, 30);
  } catch (_) { return []; }
}
function writeAll(pointers: AIPointer[]) {
  try { Taro.setStorageSync(KEY, pointers); } catch (_) { /* Restoration is optional, never block report reading. */ }
}
export function readAIPointer(scope: AIAccountScope) {
  if (!scope.accountId) return undefined;
  return readAll().find(p => matches(p, scope));
}
export function saveAIPointer(scope: AIAccountScope, generationId: string, sourceReportId = '') {
  if (!scope.accountId || !generationId) return;
  // Whitelist fields, never persist the API response or content.
  const pointer: AIPointer = { schemaVersion: 1, accountId: scope.accountId, assessmentId: scope.assessmentId, testeeId: scope.testeeId,
    locale: 'zh-CN', focusAreas: [], generationId, sourceReportId, updatedAt: Date.now() };
  writeAll([pointer, ...readAll().filter(p => !matches(p, scope))].slice(0, 30));
}
export function removeAIPointer(scope: AIAccountScope) { writeAll(readAll().filter(p => !matches(p, scope))); }
export function removeAIAccountPointers(accountId: string) { writeAll(readAll().filter(p => p.accountId !== accountId)); }

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
