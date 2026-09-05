import Taro from '@tarojs/taro';
import { request } from '../servers';
import { createRequestLifetime } from '../requestLifetime';
import sessionManager from '../auth/sessionManager';

jest.mock('@/config.js', () => ({ collectionHost: 'https://collection.invalid/api/v1' }));
jest.mock('@/shared/stores/session', () => ({ getAccessToken: () => 'private-access-token' }));
jest.mock('../auth/sessionManager', () => ({ ensureValidAccessToken: jest.fn(), refreshSession: jest.fn(), clearSession: jest.fn() }));
jest.mock('../auth/authorization', () => ({ isSessionExpiredCode: code => ['401','403'].includes(code), errorHandler: { handleAuthError: () => true } }));
const settings = { method: 'POST', needToken: true, retry429: false, refreshOnForbidden: false, logPolicy: 'metadata_only', allowInteractiveLogin: false, suppressErrorToast: true, timeout: 15000 };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
let requests;
let logs;
beforeEach(() => {
  jest.useFakeTimers(); requests = [];
  logs = ['log','info','warn','error'].map(level => jest.spyOn(console, level).mockImplementation(() => {}));
  sessionManager.ensureValidAccessToken.mockResolvedValue('private-access-token');
  Taro.request = jest.fn(options => { requests.push(options); return { abort: jest.fn() }; });
});
afterEach(() => { jest.useRealTimers(); logs.forEach(log => log.mockRestore()); });

test('AI 429 rejects immediately with Retry-After, no delayed POST', async () => {
  const result = request('/assessments/1/ai-explanations', {}, settings);
  const rejected = expect(result).rejects.toMatchObject({ statusCode: 429, retryAfterMs: 86400000 });
  await flush(); requests[0].success({ statusCode: 429, data: { code: 429 }, header: { 'Retry-After': '86400' } });
  await rejected; jest.runAllTimers(); expect(Taro.request).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
test('202 is unwrapped and no request, response or token content is logged', async () => {
  const result = request('/assessments/1/ai-explanations', { sensitive: 'private-input' }, settings);
  await flush(); requests[0].success({ statusCode: 202, data: { code: 0, data: { status: 'pending', private: 'private-output' } } });
  await expect(result).resolves.toMatchObject({ status: 'pending' });
  expect(JSON.stringify(logs.flatMap(log => log.mock.calls))).not.toMatch(/private-input|private-output|private-access-token/);
  expect(sessionManager.ensureValidAccessToken).toHaveBeenCalledWith({ allowInteractiveLogin: false });
  expect(requests[0].timeout).toBe(15000);
});
test('cancellation before auth resolves prevents first request', async () => {
  let finish; sessionManager.ensureValidAccessToken.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const lifetime = createRequestLifetime();
  const result = request('/ai', {}, { ...settings, lifetime });
  const rejected = expect(result).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  lifetime.cancel(); finish('new-token'); await rejected;
  expect(Taro.request).not.toHaveBeenCalled();
});
test('cancellation aborts active task and ignores late result', async () => {
  const abort = jest.fn(); Taro.request.mockImplementation(options => { requests.push(options); return { abort }; });
  const lifetime = createRequestLifetime(); const result = request('/ai', {}, { ...settings, lifetime });
  const rejected = expect(result).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  await flush(); lifetime.cancel(); await rejected;
  expect(abort).toHaveBeenCalledTimes(1);
  await requests[0].success({ statusCode: 200, data: { code: 0, data: 'private-late-output' } });
  expect(JSON.stringify(logs.flatMap(log => log.mock.calls))).not.toContain('private-late-output');
});
test('auth refresh cannot replay an old page POST or clear the newer session', async () => {
  let finish; sessionManager.refreshSession.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const lifetime = createRequestLifetime(); const result = request('/ai', {}, { ...settings, lifetime });
  const rejected = expect(result).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  await flush(); const callback = requests[0].success({ statusCode: 401, data: { code: 401 } });
  await flush(); lifetime.cancel(); finish('new-token'); await callback; await rejected;
  expect(Taro.request).toHaveBeenCalledTimes(1); expect(sessionManager.clearSession).not.toHaveBeenCalled();
});
test('ordinary requests retain existing bounded 429 retries', async () => {
  const result = request('/ordinary', {}, { ...settings, retry429: true });
  await flush(); await requests[0].success({ statusCode: 429, data: {} });
  jest.advanceTimersByTime(800); await flush();
  requests[1].success({ statusCode: 200, data: { code: 0, data: 'ok' } });
  await expect(result).resolves.toBe('ok'); expect(Taro.request).toHaveBeenCalledTimes(2);
});
test('HTTP date Retry-After is honored', async () => {
  jest.setSystemTime(new Date('2026-09-05T10:00:00Z'));
  const result = request('/ai', {}, settings);
  const rejected = expect(result).rejects.toMatchObject({ retryAfterMs: 60000 });
  await flush(); requests[0].success({ statusCode: 429, header: { 'retry-after': 'Sat, 05 Sep 2026 10:01:00 GMT' }, data: {} });
  await rejected;
});

test('AI 403 is a permission failure, not a token refresh or logout', async () => {
  const result = request('/ai', {}, settings);
  const rejected = expect(result).rejects.toMatchObject({ statusCode: 403 });
  await flush(); await requests[0].success({ statusCode: 403, data: { code: 403 } });
  await rejected; expect(sessionManager.refreshSession).not.toHaveBeenCalled(); expect(sessionManager.clearSession).not.toHaveBeenCalled();
});
