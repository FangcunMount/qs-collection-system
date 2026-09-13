import * as api from '@/services/api/aiExplanationApi';
import { isWorkflowRequestId, isReportId } from '@/services/api/aiExplanationApi';
import { createAIRequestId } from './aiExplanationRequestId';
import type { AIOutput, AIScope, AIWorkflowCommand } from '@/services/api/aiExplanationApi';
import { createRequestLifetime } from '@/services/requestLifetime';
import type { RequestLifetime } from '@/services/requestLifetime';
import { readAIPointer, saveAIPointer, removeAIPointer, readAIRetryAt, saveAIRetryAt } from './aiExplanationContextStore';
import type { AIAccountScope } from './aiExplanationContextStore';
import { AI_WAIT_LIMIT_MS, AI_LONG_WAIT_MS, AI_NETWORK_RETRY_LIMIT, aiPollDelay, isAIWaiting } from './waitForAIExplanation';

export type AIViewState = 'checking' | 'ready' | 'submitting' | 'waiting' | 'generated' | 'failed' | 'unavailable' |
  'storageUnavailable' | 'limited' | 'unconfirmed' | 'paused' | 'unsupported' | 'forbidden' | 'authRequired' | 'invalid';
export interface AIState {
  view: AIViewState; output?: AIOutput; requestId?: string; retryAt?: number;
  refreshError?: boolean; longWait?: boolean; animateCompletion?: boolean;
}
interface Dependencies {
  capability: (scope: AIScope, lifetime?: RequestLifetime) => Promise<AIOutput>;
  request: (scope: AIScope, command: AIWorkflowCommand, lifetime?: RequestLifetime) => Promise<AIOutput>;
  get: (scope: AIScope, activeRequestId: string, lifetime?: RequestLifetime) => Promise<AIOutput>;
  read: typeof readAIPointer; save: typeof saveAIPointer; remove: typeof removeAIPointer;
  readRetryAt: typeof readAIRetryAt; saveRetryAt: typeof saveAIRetryAt;
  now: () => number; random: () => number; createRequestId: () => Promise<string>;
}
export function createAIExplanationController(scope: AIAccountScope, onChange: (state: AIState) => void,
  options: { requestId?: string; poll?: boolean; isCurrent?: () => boolean } = {}, overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = { capability: api.getAIExplanationCapability, request: api.requestAIExplanation, get: api.getAIExplanation,
    read: readAIPointer, save: saveAIPointer, remove: removeAIPointer, readRetryAt: readAIRetryAt, saveRetryAt: saveAIRetryAt, now: Date.now, random: Math.random, createRequestId: createAIRequestId, ...overrides };
  let state: AIState = { view: 'checking' };
  let activeRequestId = options.requestId || '';
  let reportId = '';
  let lifetime: RequestLifetime | undefined;
  let active = false;
  let epoch = 0;
  let busy = false;
  let startedAt = 0;
  let attempts = 0;
  let errors = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let longWaitTimer: ReturnType<typeof setTimeout> | undefined;
  const current = () => active && (options.isCurrent?.() ?? true);
  const emit = (next: AIState) => { state = { ...next, requestId: activeRequestId || undefined }; onChange(state); };
  const clearTimers = () => { clearTimeout(timer); clearTimeout(deadline); clearTimeout(longWaitTimer); };
  const resetRequest = () => {
    epoch += 1;
    lifetime?.cancel();
    lifetime = createRequestLifetime(current);
    busy = false;
    clearTimers();
  };
  const allowed = (version: number) => current() && version === epoch;
  const pause = () => {
    resetRequest();
    emit({ view: 'paused', output: state.output, longWait: true });
  };
  const armDeadline = () => {
    if (options.poll === false) return;
    clearTimeout(deadline); clearTimeout(longWaitTimer);
    const elapsed = deps.now() - startedAt;
    deadline = setTimeout(() => { if (current()) pause(); }, Math.max(0, AI_WAIT_LIMIT_MS - elapsed));
    if (elapsed < AI_LONG_WAIT_MS) longWaitTimer = setTimeout(() => {
      if (current() && state.view === 'waiting') emit({ ...state, longWait: true });
    }, AI_LONG_WAIT_MS - elapsed);
  };
  const schedule = () => {
    if (!current() || options.poll === false) return;
    if (deps.now() - startedAt >= AI_WAIT_LIMIT_MS) { pause(); return; }
    timer = setTimeout(() => { void read(); }, aiPollDelay(attempts++, deps.random));
    armDeadline();
  };
  function accept(output: AIOutput) {
    errors = 0;
    if (output.requestId) {
      if (activeRequestId && output.requestId !== activeRequestId || reportId && output.source_report_id && reportId !== output.source_report_id) throw new api.AIContractError();
      activeRequestId = output.requestId;
      reportId = output.source_report_id || reportId;
      deps.save(scope, activeRequestId, reportId);
    }
    const view: AIViewState = isAIWaiting(output.status) ? 'waiting' : output.status === 'ready' ? 'ready' :
      output.status === 'generated' ? 'generated' : output.status === 'failed' ? 'failed' : 'unavailable';
    const animateCompletion = state.view === 'waiting' && view === 'generated';
    emit({ view, output, animateCompletion, longWait: view === 'waiting' && deps.now() - startedAt >= AI_LONG_WAIT_MS });
    if (view === 'waiting') schedule();
    else clearTimers();
  }
  function handleError(error: unknown, operation: 'get' | 'post') {
    const err = error as { code?: string; statusCode?: number; retryAfterMs?: number; reason?: string };
    clearTimers();
    if (err.code === 'AI_STORAGE_UNAVAILABLE') { emit({ view: 'storageUnavailable' }); return; }
    if (err.code === 'AI_CONTRACT_UNSUPPORTED') { emit({ view: 'unsupported' }); return; }
    if (err.statusCode === 403) { try { deps.remove(scope); } catch (_) { /* Never keep output visible after revocation. */ } activeRequestId = ''; reportId = ''; emit({ view: 'forbidden' }); return; }
    if (err.statusCode === 401 || ['anonymous','session_expired','unregistered','session_changed'].includes(err.reason || '')) {
      emit({ view: 'authRequired' }); return;
    }
    if (err.statusCode === 429) {
      const delay = Number.isFinite(err.retryAfterMs) ? Math.max(err.retryAfterMs || 0, 1000) : 1000;
      const retryAt = deps.now() + delay;
      deps.saveRetryAt(scope, retryAt);
      emit({ view: 'limited', retryAt }); return;
    }
    if (operation === 'get' && err.statusCode === 404 && activeRequestId) {
      emit({ view: 'unconfirmed' }); return; // Keep the same durable command; a missing read is not proof the POST failed.
    }
    if (operation === 'post') {
      emit({ view: err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? 'unavailable' : 'unconfirmed' });
      return;
    }
    const transient = !err.statusCode || err.statusCode >= 500;
    if (activeRequestId && transient && options.poll !== false && ++errors <= AI_NETWORK_RETRY_LIMIT) {
      emit({ view: 'waiting', output: state.output, refreshError: true }); schedule();
    } else emit({ view: 'paused' });
  }
  async function read() {
    if (!current() || busy) return;
    busy = true;
    const version = epoch;
    try {
      // Entry may discover a pointer created on the detail page while it was hidden.
      restorePointer();
      const output = activeRequestId ? await deps.get(scope, activeRequestId, lifetime) : await deps.capability(scope, lifetime);
      if (allowed(version)) { busy = false; accept(output); }
    } catch (error) {
      if (allowed(version)) { busy = false; handleError(error, 'get'); }
    } finally { if (version === epoch) busy = false; }
  }
  function restorePointer() {
    const pointer = deps.read(scope);
    if (pointer && (!activeRequestId || pointer.requestId === activeRequestId)) {
      activeRequestId = pointer.requestId;
      reportId = pointer.sourceReportId || reportId;
    }
  }
  async function submit() {
    busy = true;
    const version = epoch;
    emit({ view: 'submitting' });
    try {
      // Fail before POST when storage is unavailable; retries retain both identities.
      deps.save(scope, activeRequestId, reportId);
      const output = await deps.request(scope, { requestId: activeRequestId, reportId }, lifetime);
      if (allowed(version)) { busy = false; accept(output); }
    } catch (error) {
      if (allowed(version)) { busy = false; handleError(error, 'post'); }
    } finally { if (version === epoch) busy = false; }
  }
  function begin() {
    if (!scope.accountId) { emit({ view: 'authRequired' }); return false; }
    if (!isReportId(scope.assessmentId) || !isReportId(scope.testeeId) || activeRequestId && !isWorkflowRequestId(activeRequestId)) { emit({ view: 'invalid' }); return false; }
    const retryAt = Math.max(state.retryAt || 0, deps.readRetryAt(scope));
    if (deps.now() < retryAt) { emit({ view: 'limited', retryAt }); return false; }
    resetRequest();
    startedAt = deps.now(); attempts = 0; errors = 0;
    return true;
  }
  return {
    getState: () => state,
    show() {
      if (active) return;
      active = true;
      if (begin()) { emit({ view: 'checking' }); void read(); }
    },
    hide() {
      active = false; resetRequest();
      // An aborted POST may already be accepted; never replay it on show.
      emit({ view: state.view === 'submitting' ? 'unconfirmed' : state.view, retryAt: state.retryAt });
    },
    refresh() {
      if (!current() || busy || !begin()) return;
      emit({ view: 'checking' }); void read();
    },
    async prepare() {
      if (!current() || busy || state.view !== 'unconfirmed' || !begin()) return;
      if (activeRequestId && reportId) await submit();
      else { emit({ view: 'checking' }); void read(); }
    },
    async start() {
      if (!current() || busy || state.view !== 'ready' || !begin()) return;
      const selectedReport = state.output?.source_report_id;
      if (!selectedReport || !isReportId(selectedReport)) { emit({ view: 'unsupported' }); return; }
      busy = true;
      const version = epoch;
      emit({ view: 'submitting' });
      try {
        restorePointer();
        if (activeRequestId) { busy = false; await read(); return; }
        const requestId = await deps.createRequestId();
        if (!allowed(version)) return;
        // A second page may have submitted while random bytes were being acquired.
        restorePointer();
        if (activeRequestId) { busy = false; await read(); return; }
        if (!isWorkflowRequestId(requestId)) throw new api.AIContractError();
        activeRequestId = requestId; reportId = selectedReport;
        await submit();
      } catch (error) {
        if (allowed(version)) { busy = false; handleError(error, 'post'); }
      } finally { if (version === epoch) busy = false; }
    },
  };
}
