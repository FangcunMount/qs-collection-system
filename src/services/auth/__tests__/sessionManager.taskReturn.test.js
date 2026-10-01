import Taro from '@tarojs/taro';
import { loginSession, clearSession } from '../sessionManager';
import * as auth from '@/services/api/auth';
import { authorizationHandler } from '../authorization';
jest.mock('@/services/api/auth', () => ({ refreshToken: jest.fn(), login: jest.fn() }));
jest.mock('@/shared/platform/weapp/wxApi', () => ({getWxApi: () => ({login: ({success}) => success({code:'wechat-code'})})}));
jest.mock('../authorization', () => ({ authorizationHandler: { redirectToRegister: jest.fn() } }));

test('unregistered task user carries only task ID into registration return', async () => {
 const logs = ['log', 'info', 'warn', 'error'].map(level => jest.spyOn(console, level).mockImplementation(() => {}));
 const old = Taro.getCurrentPages;
 Taro.getCurrentPages = () => [{ options: { task_id: '42', token: 'legacy', q: 'forged', t: '99' } }];
 clearSession();
 auth.login.mockResolvedValue({ ok: false, reason: 'unregistered' });
 await expect(loginSession()).rejects.toMatchObject({ reason: 'unregistered' });
 expect(authorizationHandler.redirectToRegister).toHaveBeenCalledWith({ goUrl: '/pages/assessment/fill/index', goParams: JSON.stringify({ task_id: '42' }) });
 Taro.getCurrentPages = old;
 logs.forEach(log => log.mockRestore());
});
