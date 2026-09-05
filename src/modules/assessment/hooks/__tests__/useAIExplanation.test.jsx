import React from 'react';
import renderer, { act } from 'react-test-renderer';
import * as api from '@/services/api/aiExplanationApi';
import { useAIExplanation } from '../useAIExplanation';
import { setUserInfo } from '@/store/userStore';
import { setToken, clearToken } from '@/store/tokenStore';
import { ready, pending, generated } from '../../../../../scripts/test/fixtures/aiExplanation';
let mockHide, mockShow, mockUnload;
jest.mock('@tarojs/taro', () => ({ ...jest.requireActual('@tarojs/taro'), useDidHide: callback => { mockHide = callback; }, useDidShow: callback => { mockShow = callback; }, useUnload: callback => { mockUnload = callback; } }));
jest.mock('@/services/api/aiExplanationApi', () => ({ getAIExplanationCapability: jest.fn(), requestAIExplanation: jest.fn(), getAIExplanation: jest.fn() }));
jest.mock('@/services/api/account', () => ({ getAccountProfile: jest.fn() }));
let hook, tree, logs;
function Harness({ aid = '101', tid = '201' }) { hook = useAIExplanation({ assessmentId: aid, testeeId: tid }); return null; }
const settle = async fn => act(async () => { fn?.(); for (let i = 0; i < 12; i++) await Promise.resolve(); });
beforeEach(() => {
  jest.useFakeTimers(); logs = ['log','info','warn','error'].map(level => jest.spyOn(console, level).mockImplementation(() => {}));
  clearToken(); setToken({ access_token: 'dummy-test-token', refresh_token: 'dummy-refresh-token', expires_in: 3600 }); setUserInfo({ id: 'account-1', name: 'Test', picture: '' });
  api.getAIExplanationCapability.mockResolvedValue(ready); api.requestAIExplanation.mockResolvedValue(pending); api.getAIExplanation.mockResolvedValue(generated);
});
afterEach(() => { act(() => tree?.unmount()); clearToken(); jest.useRealTimers(); logs.forEach(log => log.mockRestore()); });

test('detail lifecycle hides polling and resumes GET, then logout clears content synchronously', async () => {
  await settle(() => { tree = renderer.create(<Harness />); });
  expect(hook.state.view).toBe('ready'); await settle(() => { void hook.start(); });
  expect(hook.state.view).toBe('waiting'); await settle(() => mockHide());
  jest.advanceTimersByTime(10000); expect(api.getAIExplanation).not.toHaveBeenCalled();
  await settle(() => mockShow()); expect(hook.state.view).toBe('generated');
  await settle(() => clearToken()); expect(hook.state.output).toBeUndefined(); expect(hook.state.view).toBe('authRequired');
  expect(api.requestAIExplanation).toHaveBeenCalledTimes(1);
});
test('route testee change cancels old request and cannot render old content', async () => {
  let finish; api.requestAIExplanation.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await settle(() => { tree = renderer.create(<Harness />); }); await settle(() => { void hook.start(); });
  const lifetime = api.requestAIExplanation.mock.calls[0][1];
  await settle(() => tree.update(<Harness aid="102" tid="202" />)); expect(lifetime.isActive()).toBe(false);
  await settle(() => finish(generated)); expect(hook.state.view).toBe('ready'); expect(hook.state.output?.content).toBeUndefined();
  expect(api.getAIExplanationCapability.mock.calls.at(-1)[0]).toMatchObject({ assessmentId: '102', testeeId: '202' });
});
test('account change cancels old lifetime before starting another account request', async () => {
  await settle(() => { tree = renderer.create(<Harness />); }); await settle(() => { void hook.start(); });
  const oldLifetime = api.requestAIExplanation.mock.calls[0][1];
  await settle(() => setUserInfo({ id: 'account-2', name: 'Other', picture: '' }));
  expect(oldLifetime.isActive()).toBe(false); expect(hook.state.generationId).toBeUndefined();
  expect(api.getAIExplanation).not.toHaveBeenCalled(); await settle(() => mockUnload()); expect(jest.getTimerCount()).toBe(0);
});
