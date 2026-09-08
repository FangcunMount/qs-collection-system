import { bootstrapSession, ensureValidAccessToken, loginSession, clearSession } from '../sessionManager';
import { getAccessToken, getRefreshToken, setToken } from '@/shared/stores/session';
import * as auth from '@/services/api/auth';
jest.mock('@/services/api/auth', () => ({ refreshToken: jest.fn(), login: jest.fn() }));
jest.mock('@/shared/platform/weapp/wxApi', () => ({getWxApi: () => ({reLaunch: jest.fn(), login: ({success}) => success({code:'new-wechat-code'})})}));
let logs;
beforeEach(() => { logs = ['log','info','warn','error'].map(level => jest.spyOn(console,level).mockImplementation(() => {})); clearSession(); });
afterEach(() => logs.forEach(log => log.mockRestore()));
test.each(['bootstrap', 'request rejection'])('retired refresh clears session and permits new WeChat login: %s', async mode => {
 setToken({access_token:'old-access', refresh_token:'old-refresh', expires_in:-1});
 auth.refreshToken.mockResolvedValue({ok:false, reason:'session_expired', code:'401'});
 if (mode === 'bootstrap') expect((await bootstrapSession()).status).toBe('anonymous');
 else await expect(ensureValidAccessToken({forceRefresh:true})).rejects.toMatchObject({reason:'session_expired'});
 expect(getAccessToken()).toBeFalsy(); expect(getRefreshToken()).toBeFalsy();
 auth.login.mockResolvedValue({ok:true,accessToken:'new-access',refreshToken:'new-refresh',expiresIn:3600});
 await loginSession();
 expect(auth.login).toHaveBeenCalledWith('new-wechat-code',expect.any(String));
 expect(getAccessToken()).toBe('new-access'); expect(getRefreshToken()).toBe('new-refresh');
});
