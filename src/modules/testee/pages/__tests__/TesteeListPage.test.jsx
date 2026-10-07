import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import TesteeListPage from '../TesteeListPage';
import { routes } from '@/shared/config/routes';

jest.mock('@/shared/stores/testees', () => ({
  getTesteeStoreState: () => ({ testeeList: [], isInitialized: true, isLoading: false, selectedTesteeId: '' }),
  initTesteeStore: jest.fn().mockResolvedValue(undefined),
  refreshTesteeList: jest.fn().mockResolvedValue(undefined),
  setSelectedTesteeId: jest.fn(),
  subscribeTesteeStore: () => () => {},
}));

test('an empty profile list offers profile creation as its only action', async () => {
  const navigate = jest.spyOn(Taro, 'navigateTo').mockResolvedValue({});
  let tree;
  try {
    await act(async () => { tree = renderer.create(<TesteeListPage />); });
    expect(JSON.stringify(tree.toJSON())).toContain('暂无档案信息');
    expect(JSON.stringify(tree.toJSON())).toContain('添加档案');
    const buttons = tree.root.findAllByType('taro-button');
    expect(buttons).toHaveLength(1);
    await act(async () => { await buttons[0].props.onClick(); });
    expect(navigate).toHaveBeenCalledWith({ url: routes.testeeCreate() });
  } finally {
    if (tree) act(() => tree.unmount());
    navigate.mockRestore();
  }
});
