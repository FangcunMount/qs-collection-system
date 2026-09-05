import { useEffect, useRef, useState } from 'react';
import { useDidHide, useDidShow, useUnload } from '@tarojs/taro';
import { getUserInfo, subscribeUserStore } from '@/store/userStore';
import { getAccessToken, subscribeTokenStore } from '@/shared/stores/session';
import type { AIScope } from '@/services/api/aiExplanationApi';
import { createAIExplanationController } from '../services/aiExplanationController';
import type { AIState } from '../services/aiExplanationController';
import { removeAIAccountPointers } from '../services/aiExplanationContextStore';

const accountId = () => {
  const id = getUserInfo()?.id;
  return getAccessToken() && typeof id === 'string' ? id : '';
};
export function useAIExplanation(scope: AIScope, options: { generationId?: string; poll?: boolean } = {}) {
  const [account, setAccount] = useState(accountId);
  const [state, setState] = useState<AIState>({ view: 'checking' });
  const [visible, setVisible] = useState(true);
  const scopeKey = [account, scope.assessmentId, scope.testeeId, options.generationId || ''].join('|');
  const scopeRef = useRef(scopeKey);
  scopeRef.current = scopeKey;
  const controllerScope = useRef('');
  const controller = useRef<ReturnType<typeof createAIExplanationController> | null>(null);
  const visibleRef = useRef(true);
  useEffect(() => {
    let previous = accountId();
    const sync = () => {
      const next = accountId();
      if (previous !== next) {
        controller.current?.hide();
        if (previous) removeAIAccountPointers(previous);
        previous = next;
      }
      setAccount(next);
    };
    const offUser = subscribeUserStore(sync);
    const offToken = subscribeTokenStore(sync);
    return () => { offUser(); offToken(); };
  }, []);
  useEffect(() => {
    let mounted = true;
    const instance = createAIExplanationController({ ...scope, accountId: account }, next => {
      if (mounted && scopeRef.current === scopeKey) setState(next);
    }, { ...options, isCurrent: () => accountId() === account && scopeRef.current === scopeKey });
    controller.current = instance;
    controllerScope.current = scopeKey;
    if (visibleRef.current) instance.show();
    return () => { mounted = false; instance.hide(); if (controller.current === instance) controller.current = null; };
  }, [account, scope.assessmentId, scope.testeeId, options.generationId, options.poll, scopeKey]);
  useDidShow(() => { visibleRef.current = true; setVisible(true); controller.current?.show(); });
  useDidHide(() => { visibleRef.current = false; setVisible(false); controller.current?.hide(); });
  useUnload(() => { visibleRef.current = false; controller.current?.hide(); });
  const currentState: AIState = controllerScope.current === scopeKey ? state : { view: 'checking' };
  return { state: currentState, visible, start: () => controller.current?.start(), refresh: () => controller.current?.refresh(),
    prepare: () => controller.current?.prepare() };
}
