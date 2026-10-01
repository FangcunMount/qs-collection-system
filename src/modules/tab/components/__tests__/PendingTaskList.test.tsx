import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import PendingTaskList from '../PendingTaskList';
import { listPlanTasks } from '@/services/api/planTaskEntries';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';

jest.mock('@/services/api/planTaskEntries', () => ({ listPlanTasks: jest.fn() }));
const api = listPlanTasks as jest.Mock;
const task = { task_id: '42', title: '测试测评', plan_id: '8', open_at: '2026-10-01T08:00:00+08:00', due_at: '2026-10-08T08:00:00+08:00', expires_at: '2026-10-08T08:00:00+08:00', can_start: true };
let tree: renderer.ReactTestRenderer;
const text = () => JSON.stringify(tree.toJSON());
beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-10-01T09:00:00+08:00')); api.mockReset().mockResolvedValue({ items: [] }); });
afterEach(() => { if (tree) act(() => tree.unmount()); jest.useRealTimers(); jest.restoreAllMocks(); });

test('shows task facts and enters with only task ID; expiry disables stale rows', async () => {
 api.mockResolvedValue({ items: [task] });
 const navigate = jest.spyOn(Taro, 'navigateTo');
 await act(async () => { tree = renderer.create(<PendingTaskList testeeId="31" />); });
 expect(text()).toContain('测试测评'); expect(text()).toContain('所属计划'); expect(text()).toContain('截止时间');
 const button = () => tree.root.findAllByType('taro-view').find(node => String(node.props.className || '').startsWith('pending-tasks__start'))!;
 act(() => button().props.onClick());
 expect(navigate).toHaveBeenCalledWith({ url: '/pages/assessment/fill/index?task_id=42' });
 navigate.mockClear();
 jest.setSystemTime(new Date(task.expires_at));
 await act(async () => { jest.advanceTimersByTime(15000); });
 act(() => button().props.onClick()); expect(navigate).not.toHaveBeenCalled();
});

test('switching family profile ignores a late old member response', async () => {
 let resolve: (result: unknown) => void = () => {};
 api.mockImplementationOnce(() => new Promise(yes => { resolve = yes; }));
 await act(async () => { tree = renderer.create(<PendingTaskList testeeId="31" />); });
 await act(async () => { tree.update(<PendingTaskList testeeId="32" />); });
 await act(async () => { resolve({ items: [task] }); });
 expect(api).toHaveBeenLastCalledWith('32'); expect(text()).not.toContain('测试测评');
});

test('logout clears task content and ignores in-flight results', async () => {
 let resolve: (result: unknown) => void = () => {};
 api.mockImplementationOnce(() => new Promise(yes => { resolve = yes; }));
 await act(async () => { tree = renderer.create(<PendingTaskList testeeId="31" />); });
 act(() => clearPrivateSessionState());
 await act(async () => { resolve({ items: [task] }); });
 expect(text()).not.toContain('测试测评');
});

test('completed tasks disappear on the next refresh', async () => {
 api.mockResolvedValueOnce({ items: [task] }).mockResolvedValue({ items: [] });
 await act(async () => { tree = renderer.create(<PendingTaskList testeeId="31" />); });
 expect(text()).toContain('测试测评');
 await act(async () => { jest.advanceTimersByTime(15000); });
 expect(text()).not.toContain('测试测评');
});
