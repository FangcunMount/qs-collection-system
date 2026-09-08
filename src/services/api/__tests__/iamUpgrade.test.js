import { request } from '../../servers';
import { login, refreshToken, logout, verifyToken, registerWechatAccount } from '../iamAuthnApi';
import { getMe } from '../iamIdentityApi';
import { postUserRegister } from '../register';
import { getUrl } from '@/shared/lib/url';
jest.mock('../../servers', () => ({ request: jest.fn() }));
beforeEach(() => { request.mockResolvedValue({access_token:'new-access', refresh_token:'new-refresh', expires_in:3600}); });
test('AuthN lifecycle uses v3 while Identity remains v2', async () => {
 await login('wechat-code', 'app'); await refreshToken('refresh'); await logout('access','refresh');
 await registerWechatAccount('wechat-code','app'); await postUserRegister({jsCode:'wechat-code', appId:'app'});
 expect(request.mock.calls).toHaveLength(5);
 for (const [, , options] of request.mock.calls) expect(options.host).toBe('https://iam.fangcunmount.cn/api/v3');
 await getMe(); expect(request.mock.calls[5][2].host).toBe('https://iam.fangcunmount.cn/api/v2');
 expect(getUrl('/authn/login')).toContain('/api/v3/authn/login?');
 expect(getUrl('/identity/me')).toContain('/api/v2/identity/me?');
});
test('verify normalizes explicit audience and rejects invalid constraints before HTTP', async () => {
 for (const audience of [undefined, [], [' '], ['collection-api', ''], 'collection-api']) {
  await expect(verifyToken('access', audience)).rejects.toThrow();
 }
 expect(request).not.toHaveBeenCalled();
 await verifyToken('access', [' collection-api ', 'collection-api']);
 expect(request).toHaveBeenCalledWith('/authn/verify', {access_token:'access',expected_audience:['collection-api']}, expect.objectContaining({host:'https://iam.fangcunmount.cn/api/v3', logPolicy:'metadata_only'}));
});

test.each(['develop', 'trial', 'release'])('%s keeps independent API versions', environment => {
 jest.isolateModules(() => {
  jest.doMock('@tarojs/taro', () => ({getAccountInfoSync: () => ({miniProgram:{envVersion:environment}})}));
  const config = require('@/config').default;
  expect(config.iamAuthnHost).toBe('https://iam.fangcunmount.cn/api/v3');
  expect(config.iamIdentityHost).toBe('https://iam.fangcunmount.cn/api/v2');
  expect(config.collectionHost).toBe('https://collect.fangcunmount.cn/api/v1');
 });
 jest.dontMock('@tarojs/taro');
});
