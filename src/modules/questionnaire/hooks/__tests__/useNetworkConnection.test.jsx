import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import { useNetworkConnection } from '../useNetworkConnection';
let connected, onChange, tree;
const Harness = () => { connected = useNetworkConnection(); return null; };
beforeEach(() => {
  Taro.onNetworkStatusChange = jest.fn(callback => { onChange = callback; });
  Taro.offNetworkStatusChange = jest.fn();
});
afterEach(() => {
  if (tree) act(() => tree.unmount()); tree = undefined;
  delete Taro.getNetworkType; delete Taro.onNetworkStatusChange; delete Taro.offNetworkStatusChange;
});
test('unknown stays unknown, then offline and reconnect observations update without blocking interaction', async () => {
  Taro.getNetworkType = jest.fn().mockResolvedValue({ networkType: 'unknown' });
  await act(async () => { tree = renderer.create(<Harness />); }); expect(connected).toBeNull();
  act(() => onChange({ isConnected: false, networkType: 'none' })); expect(connected).toBe(false);
  act(() => onChange({ isConnected: true, networkType: 'wifi' })); expect(connected).toBe(true);
  act(() => tree.unmount()); tree = undefined;
  expect(Taro.offNetworkStatusChange).toHaveBeenCalledWith(onChange);
});
test('a late initial query cannot overwrite a newer connection event', async () => {
  let finish; Taro.getNetworkType = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { tree = renderer.create(<Harness />); });
  act(() => onChange({ isConnected: false, networkType: 'none' }));
  await act(async () => { finish({ networkType: 'wifi' }); }); expect(connected).toBe(false);
});
test('a rejected device query does not invent an offline warning', async () => {
  Taro.getNetworkType = jest.fn().mockRejectedValue(new Error('unavailable'));
  await act(async () => { tree = renderer.create(<Harness />); }); expect(connected).toBeNull();
});
