import Taro from '@tarojs/taro';
import { readAIPointer, saveAIPointer, removeAIPointer, readAIRetryAt, saveAIRetryAt } from '../aiExplanationContextStore';
import { PRIVATE_SESSION_PREFIX, clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
const scope = { accountId: 'account-1', assessmentId: '101', testeeId: '201' };
beforeEach(() => { clearPrivateSessionState(); });
test('stores only whitelisted pointers and isolates account, testee and assessment', () => {
  saveAIPointer({ ...scope, content: 'private-report', token: 'private-token' }, '00000000-0000-4000-8000-000000000001', '99');
  expect(readAIPointer(scope)).toMatchObject({ generationId: '00000000-0000-4000-8000-000000000001', sourceReportId: '99' });
  ['accountId','assessmentId','testeeId'].forEach(key => expect(readAIPointer({ ...scope, [key]: 'other' })).toBeUndefined());
  const value = Taro.getStorageInfoSync().keys.map(key => Taro.getStorageSync(key));
  expect(JSON.stringify(value)).not.toMatch(/private-report|private-token/);
  removeAIPointer(scope); expect(readAIPointer(scope)).toBeUndefined();
});
test('unresolved request identities neither expire nor get evicted by other assessments', () => {
  jest.useFakeTimers();
  const id='00000000-0000-4000-8000-000000000001';
  for (let i=1;i<=35;i++) saveAIPointer({...scope,assessmentId:String(i)},id,'99');
  jest.advanceTimersByTime(8*86400000);
  expect(readAIPointer({...scope,assessmentId:'1'}).generationId).toBe(id);
  expect(readAIPointer({...scope,assessmentId:'35'})).toBeDefined();
  jest.useRealTimers();
});
test('session clear removes pointers without removing unrelated app settings', () => {
  Taro.setStorageSync('non-session-setting', 'keep'); saveAIPointer(scope, '00000000-0000-4000-8000-000000000001'); clearPrivateSessionState();
  expect(readAIPointer(scope)).toBeUndefined(); expect(Taro.getStorageSync('non-session-setting')).toBe('keep');
});

test('cooldown survives page recreation, expires and is cleared on logout', () => {
  jest.useFakeTimers(); const retryAt = Date.now() + 60000; saveAIRetryAt(scope, retryAt);
  expect(readAIRetryAt(scope)).toBe(retryAt); expect(readAIRetryAt({ ...scope, accountId: 'other' })).toBe(0);
  jest.advanceTimersByTime(60001); expect(readAIRetryAt(scope)).toBe(0);
  saveAIRetryAt(scope, Date.now() + 60000); clearPrivateSessionState(); expect(readAIRetryAt(scope)).toBe(0); jest.useRealTimers();
});

test('storage write/read failures are explicit and cannot silently discard an uncertain request',()=>{
 const set=jest.spyOn(Taro,'setStorageSync').mockImplementation(()=>{throw new Error('full')});
 expect(()=>saveAIPointer(scope,'00000000-0000-4000-8000-000000000001','99')).toThrow(); set.mockRestore();
 const get=jest.spyOn(Taro,'getStorageSync').mockImplementation(()=>{throw new Error('read failure')});
 expect(()=>readAIPointer(scope)).toThrow(); get.mockRestore();
});
test('old result pointers are ignored and new pending reads preserve the original report ID',()=>{
 Taro.setStorageSync(`${PRIVATE_SESSION_PREFIX}ai-explanation:v1`,[{...scope,generationId:'123',sourceReportId:'99'}]);
 expect(readAIPointer(scope)).toBeUndefined();
 const id='00000000-0000-4000-8000-000000000001';
 saveAIPointer(scope,id,'99');saveAIPointer(scope,id);
 expect(readAIPointer(scope).sourceReportId).toBe('99');
});
