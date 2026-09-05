import Taro from '@tarojs/taro';
import { readAIPointer, saveAIPointer, removeAIPointer, readAIRetryAt, saveAIRetryAt } from '../aiExplanationContextStore';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
const scope = { accountId: 'account-1', assessmentId: '101', testeeId: '201' };
beforeEach(() => { clearPrivateSessionState(); });
test('stores only whitelisted pointers and isolates account, testee and assessment', () => {
  saveAIPointer({ ...scope, content: 'private-report', token: 'private-token' }, 'generation-1', 'report-1');
  expect(readAIPointer(scope)).toMatchObject({ generationId: 'generation-1', sourceReportId: 'report-1' });
  ['accountId','assessmentId','testeeId'].forEach(key => expect(readAIPointer({ ...scope, [key]: 'other' })).toBeUndefined());
  const value = Taro.getStorageInfoSync().keys.map(key => Taro.getStorageSync(key));
  expect(JSON.stringify(value)).not.toMatch(/private-report|private-token/);
  removeAIPointer(scope); expect(readAIPointer(scope)).toBeUndefined();
});
test('pointers are capped at 30 and expire after seven days', () => {
  jest.useFakeTimers();
  for (let i = 0; i < 35; i++) saveAIPointer({ ...scope, assessmentId: String(i) }, `generation-${i}`);
  expect(readAIPointer({ ...scope, assessmentId: '0' })).toBeUndefined();
  expect(readAIPointer({ ...scope, assessmentId: '34' })).toBeDefined();
  jest.advanceTimersByTime(7 * 86400000); expect(readAIPointer({ ...scope, assessmentId: '34' })).toBeUndefined();
  jest.useRealTimers();
});
test('session clear removes pointers without removing unrelated app settings', () => {
  Taro.setStorageSync('non-session-setting', 'keep'); saveAIPointer(scope, 'generation-1'); clearPrivateSessionState();
  expect(readAIPointer(scope)).toBeUndefined(); expect(Taro.getStorageSync('non-session-setting')).toBe('keep');
});

test('cooldown survives page recreation, expires and is cleared on logout', () => {
  jest.useFakeTimers(); const retryAt = Date.now() + 60000; saveAIRetryAt(scope, retryAt);
  expect(readAIRetryAt(scope)).toBe(retryAt); expect(readAIRetryAt({ ...scope, accountId: 'other' })).toBe(0);
  jest.advanceTimersByTime(60001); expect(readAIRetryAt(scope)).toBe(0);
  saveAIRetryAt(scope, Date.now() + 60000); clearPrivateSessionState(); expect(readAIRetryAt(scope)).toBe(0); jest.useRealTimers();
});
