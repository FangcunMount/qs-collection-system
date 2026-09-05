import { clearToken, setToken } from '../tokenStore';
import { getUserInfo, setUserInfo, initUserStore } from '../userStore';
import { getAccountProfile } from '@/services/api/account';
import { saveAIPointer, readAIPointer } from '@/modules/assessment/services/aiExplanationContextStore';
jest.mock('@/services/api/account', () => ({ getAccountProfile: jest.fn() }));
const scope = { accountId: 'account-1', assessmentId: '101', testeeId: '201' };
let logs;
beforeEach(() => { logs = ['log','info','warn','error'].map(level => jest.spyOn(console, level).mockImplementation(() => {})); clearToken(); });
afterEach(() => logs.forEach(log => log.mockRestore()));
test('clearing token removes account identity and AI restoration pointers', () => {
  setToken({ access_token: 'dummy-test-token', refresh_token: 'dummy-refresh-token', expires_in: 3600 }); setUserInfo({ id: 'account-1', name: 'Test', picture: '' }); saveAIPointer(scope, 'gid');
  clearToken(); expect(getUserInfo()?.id).toBeUndefined(); expect(readAIPointer(scope)).toBeUndefined();
});
test('late account profile response cannot revive the logged-out identity', async () => {
  let finish; getAccountProfile.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const pending = initUserStore(true); clearToken(); finish({ id: 'account-1', nickname: 'Old account' }); await pending;
  expect(getUserInfo()?.id).toBeUndefined();
  getAccountProfile.mockResolvedValue({ id: 'account-2', nickname: 'New account' }); await initUserStore();
  expect(getUserInfo()?.id).toBe('account-2');
});
