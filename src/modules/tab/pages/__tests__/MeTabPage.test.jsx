import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import MeTabPage from '../MeTabPage';
import ActionButton from '@/shared/ui/ActionButton';
import { clearSession } from '@/services/auth/sessionManager';
import { setToken, getAccessToken } from '@/shared/stores/session';
import { setAccountInfo } from '@/shared/stores/account';
import { getAccountProfile } from '@/services/api/account';
import { logout, login } from '@/services/api/auth';
jest.mock('@/services/api/account', () => ({ getAccountProfile: jest.fn() }));
jest.mock('@/services/api/auth', () => ({ logout: jest.fn(), login: jest.fn() }));
jest.mock('@/shared/platform/weapp/wxApi', () => ({ getWxApi: () => ({ login: ({ success }) => success({ code: 'test-code' }) }) }));
let tree;
const textOf = () => tree.root.findAllByType('taro-text').map(node => node.children.join('')).join('|');
const click = label => act(async () => {
  await tree.root.findAllByType(ActionButton).find(button => button.props.children === label).props.onClick();
});
beforeEach(() => {
  ['log','info','warn','error'].forEach(level => jest.spyOn(console, level).mockImplementation(() => {}));
  clearSession(); getAccountProfile.mockReset().mockResolvedValue({ id: 'account', nickname: '' });
  logout.mockResolvedValue({ ok: true });
  jest.spyOn(Taro, 'showModal').mockResolvedValue({ confirm: true });
  jest.spyOn(Taro, 'reLaunch'); jest.spyOn(Taro, 'showToast');
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.restoreAllMocks(); });

test('anonymous browsing does not request private profile or show logout, even with a stale display name', async () => {
  setAccountInfo({ name: '旧资料', picture: '' });
  await act(async () => { tree = renderer.create(<MeTabPage />); });
  expect(textOf()).toContain('登录 / 注册'); expect(textOf()).not.toContain('退出登录');
  expect(textOf()).not.toContain('旧资料'); expect(textOf()).not.toContain('2.4.0');
  expect(textOf()).not.toContain('清除缓存'); expect(getAccountProfile).not.toHaveBeenCalled();
});

test('a session without a nickname still shows the account and can log out through the session service', async () => {
  setToken({ access_token: 'test-account', refresh_token: 'test-refresh' });
  await act(async () => { tree = renderer.create(<MeTabPage />); });
  expect(textOf()).toContain('已登录用户'); expect(textOf()).toContain('退出登录');
  await click('退出登录');
  expect(getAccessToken()).toBeNull();
  expect(logout).toHaveBeenCalledWith('test-account', 'test-refresh');
  expect(Taro.reLaunch).toHaveBeenCalledWith({ url: '/pages/tab/me/index' });
  expect(textOf()).not.toContain('退出登录');
});

test('canceling logout retains the session', async () => {
  setToken({ access_token: 'test-account' }); Taro.showModal.mockResolvedValue({ confirm: false });
  await act(async () => { tree = renderer.create(<MeTabPage />); });
  await click('退出登录');
  expect(getAccessToken()).toBe('test-account'); expect(logout).not.toHaveBeenCalled();
});

test('the login action restores an existing account before showing registration', async () => {
  login.mockResolvedValue({ ok: true, accessToken: 'restored-account', refreshToken: 'test-refresh', expiresIn: 3600 });
  await act(async () => { tree = renderer.create(<MeTabPage />); });
  await click('登录 / 注册');
  expect(login).toHaveBeenCalled(); expect(getAccessToken()).toBe('restored-account');
  expect(textOf()).toContain('退出登录');
});
