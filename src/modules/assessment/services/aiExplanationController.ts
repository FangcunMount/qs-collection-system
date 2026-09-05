import * as api from '@/services/api/aiExplanationApi';
import type { AIOutput, AIScope } from '@/services/api/aiExplanationApi';
import { createRequestLifetime } from '@/services/requestLifetime';
import type { RequestLifetime } from '@/services/requestLifetime';
import { readAIPointer, saveAIPointer, removeAIPointer, readAIRetryAt, saveAIRetryAt } from './aiExplanationContextStore';
import type { AIAccountScope } from './aiExplanationContextStore';
import { AI_WAIT_LIMIT_MS, AI_LONG_WAIT_MS, AI_NETWORK_RETRY_LIMIT, aiPollDelay, isAIWaiting } from './waitForAIExplanation';

export type AIViewState = 'checking' | 'ready' | 'submitting' | 'waiting' | 'generated' | 'failed' | 'unavailable' |
  'limited' | 'unconfirmed' | 'paused' | 'unsupported' | 'forbidden' | 'authRequired' | 'invalid';
export interface AIState {
  view: AIViewState; output?: AIOutput; generationId?: string; retryAt?: number;
  refreshError?: boolean; longWait?: boolean; animateCompletion?: boolean;
}
interface Dependencies {
  capability: (scope: AIScope, lifetime?: RequestLifetime) => Promise<AIOutput>;
  request: (scope: AIScope, lifetime?: RequestLifetime) => Promise<AIOutput>;
  get: (scope: AIScope, gid: string, lifetime?: RequestLifetime) => Promise<AIOutput>;
  read: typeof readAIPointer; save: typeof saveAIPointer; remove: typeof removeAIPointer;
  readRetryAt: typeof readAIRetryAt; saveRetryAt: typeof saveAIRetryAt;
  now: () => number; random: () => number;
}
export function createAIExplanationController(scope: AIAccountScope, onChange: (state: AIState) => void,
  options: { generationId?: string; poll?: boolean; isCurrent?: () => boolean } = {}, overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = { capability: api.getAIExplanationCapability, request: api.requestAIExplanation, get: api.getAIExplanation,
    read: readAIPointer, save: saveAIPointer, remove: removeAIPointer, readRetryAt: readAIRetryAt, saveRetryAt: saveAIRetryAt, now: Date.now, random: Math.random, ...overrides };
  let state: AIState = { view: 'checking' };
  let gid = options.generationId || deps.read(scope)?.generationId || '';
  let lifetime: RequestLifetime | undefined;
  let active = false;
  let epoch = 0;
  let busy = false;
  let startedAt = 0;
  let attempts = 0;
  let errors = 0;
  let uncertain = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let longWaitTimer: ReturnType<typeof setTimeout> | undefined;
  const current = () => active && (options.isCurrent?.() ?? true);
  const emit = (next: AIState) => { state = { ...next, generationId: gid || undefined }; onChange(state); };
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
    if (output.status !== 'ready') uncertain = false;
    if (output.status === 'ready' && uncertain) { emit({ view: 'unconfirmed' }); return; }
    if (output.generation_id) {
      gid = output.generation_id;
      deps.save(scope, gid, output.source_report_id);
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
    if (operation === 'post' && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) uncertain = false;
    if (err.code === 'AI_CONTRACT_UNSUPPORTED') { emit({ view: 'unsupported' }); return; }
    if (err.statusCode === 403) { deps.remove(scope); gid = ''; emit({ view: 'forbidden' }); return; }
    if (err.statusCode === 401 || ['anonymous','session_expired','unregistered','session_changed'].includes(err.reason || '')) {
      emit({ view: 'authRequired' }); return;
    }
    if (err.statusCode === 429) {
      const delay = Number.isFinite(err.retryAfterMs) ? Math.max(err.retryAfterMs || 0, 1000) : 1000;
      const retryAt = deps.now() + delay;
      deps.saveRetryAt(scope, retryAt);
      emit({ view: 'limited', retryAt }); return;
    }
    if (operation === 'get' && err.statusCode === 404 && gid) {
      deps.remove(scope); gid = ''; emit({ view: 'checking' });
      void read(); return; // Capability only; never recreate a missing generation.
    }
    if (operation === 'post') {
      emit({ view: err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? 'unavailable' : 'unconfirmed' });
      return;
    }
    const transient = !err.statusCode || err.statusCode >= 500;
    if (gid && transient && options.poll !== false && ++errors <= AI_NETWORK_RETRY_LIMIT) {
      emit({ view: 'waiting', output: state.output, refreshError: true }); schedule();
    } else emit({ view: 'paused' });
  }
  async function read() {
    if (!current() || busy) return;
    busy = true;
    const version = epoch;
    try {
      // Entry may discover a pointer created on the detail page while it was hidden.
      if (!gid) gid = deps.read(scope)?.generationId || '';
      const output = gid ? await deps.get(scope, gid, lifetime) : await deps.capability(scope, lifetime);
      if (allowed(version)) { busy = false; accept(output); }
    } catch (error) {
      if (allowed(version)) { busy = false; handleError(error, 'get'); }
    } finally { if (version === epoch) busy = false; }
  }
  function begin() {
    if (!scope.accountId) { emit({ view: 'authRequired' }); return false; }
    if (!/^[1-9]\d*$/.test(scope.assessmentId) || !/^[1-9]\d*$/.test(scope.testeeId)) { emit({ view: 'invalid' }); return false; }
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
      if (!options.generationId) gid = deps.read(scope)?.generationId || gid;
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
    prepare() {
      if (!current() || busy || state.view !== 'unconfirmed' || !begin()) return;
      uncertain = false;
      emit({ view: 'checking' }); void read();
    },
    async start() {
      if (!current() || busy || state.view !== 'ready' || !begin()) return;
      busy = true;
      const version = epoch;
      uncertain = true;
      emit({ view: 'submitting' });
      try {
        const output = await deps.request(scope, lifetime);
        if (allowed(version)) { busy = false; accept(output); }
      } catch (error) {
        if (allowed(version)) { busy = false; handleError(error, 'post'); }
      } finally { if (version === epoch) busy = false; }
    },
  };
}
