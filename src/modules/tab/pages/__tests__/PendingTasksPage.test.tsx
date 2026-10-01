import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PendingTasksPage from '../PendingTasksPage';
import { listPlanTasks } from '@/services/api/planTaskEntries';
import { resetTesteeStore, setTesteeList, setSelectedTesteeId, initTesteeStore } from '@/shared/stores/testees';
import StatePanel from '@/shared/ui/StatePanel';

jest.mock('@/services/api/planTaskEntries', () => ({ listPlanTasks: jest.fn() }));
jest.mock('@/shared/stores/testees', () => ({ ...jest.requireActual('@/shared/stores/testees'), initTesteeStore: jest.fn().mockResolvedValue({}) }));
let tree: renderer.ReactTestRenderer;
const api = listPlanTasks as jest.Mock;
beforeEach(() => {
  jest.useFakeTimers(); resetTesteeStore();
  setTesteeList([{ id: '31', legalName: '成员一' }, { id: '32', legalName: '成员二' }]); setSelectedTesteeId('31');
  api.mockReset().mockResolvedValue({ items: [] });
  (initTesteeStore as jest.Mock).mockReset().mockResolvedValue({});
});
afterEach(() => { if (tree) act(() => tree.unmount()); jest.useRealTimers(); });
test('dedicated inbox follows the selected family member and switches the authoritative task query', async () => {
  await act(async () => { tree = renderer.create(<PendingTasksPage />); });
  expect(api).toHaveBeenLastCalledWith('31');
  expect(JSON.stringify(tree.toJSON())).toContain('成员一');
  await act(async () => { tree.root.findByType('taro-picker').props.onChange({ detail: { value: 1 } }); });
  expect(api).toHaveBeenLastCalledWith('32');
  expect(JSON.stringify(tree.toJSON())).toContain('成员二');
});
test('missing profiles offer profile management without querying a fabricated member', async () => {
  resetTesteeStore();
  await act(async () => { tree = renderer.create(<PendingTasksPage />); });
  expect(api).not.toHaveBeenCalled();
  expect(tree.root.findByType(StatePanel).props.title).toBe('还没有家庭档案');
});
test('failed profile initialization blocks task loading and offers a retry', async () => {
  (initTesteeStore as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { tree = renderer.create(<PendingTasksPage />); });
  expect(api).not.toHaveBeenCalled();
  expect(tree.root.findByType(StatePanel).props.state).toBe('error');
  await act(async () => { tree.root.findByType(StatePanel).props.onAction(); });
  expect(api).toHaveBeenLastCalledWith('31');
});
