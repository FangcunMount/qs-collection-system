import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import HomeTabPage from '../HomeTabPage';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import StatePanel from '@/shared/ui/StatePanel';
import { loadRecentAssessments } from '@/modules/assessment/services/loadRecentAssessments';
import { listHotPublishedAssessmentModels } from '@/services/api/assessmentModelCatalogApi';
import { resetTesteeStore, setTesteeList, setSelectedTesteeId } from '@/shared/stores/testees';

jest.mock('@/modules/assessment/services/loadRecentAssessments', () => ({ loadRecentAssessments: jest.fn() }));
jest.mock('@/services/api/assessmentModelCatalogApi', () => ({ listHotPublishedAssessmentModels: jest.fn() }));

const members = [{ id: 'one', legalName: '成员一' }, { id: 'two', legalName: '成员二' }];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const textOf = (component) => component.root.findAllByType('taro-text').map(node => node.children.join('')).join('|');
let component;
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  resetTesteeStore();
  setTesteeList(members);
  setSelectedTesteeId('one');
  loadRecentAssessments.mockReset().mockResolvedValue([]);
  listHotPublishedAssessmentModels.mockReset().mockResolvedValue({ data: { models: [] } });
});
afterEach(() => {
  if (component) act(() => component.unmount());
  component = undefined;
  jest.restoreAllMocks();
});

test('unknown demographics preserve all domain entries without choosing an arbitrary avatar', async () => {
  const navigate = jest.spyOn(Taro, 'navigateTo');
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  const cards = component.root.findAllByType(SurfaceCard)
    .filter(card => (card.props.className || '').startsWith('home-service '));
  expect(cards).toHaveLength(4);
  for (const card of cards.slice(0, 3)) card.props.onClick();
  expect(navigate.mock.calls.map(([arg]) => arg.url)).toEqual([
    expect.stringContaining('catalog-medical'), expect.stringContaining('catalog-personality'), expect.stringContaining('catalog-ability'),
  ]);
  expect(textOf(component)).toContain('成员一');
  expect(textOf(component)).toContain('完善资料后展示对应形象');
  expect(listHotPublishedAssessmentModels).not.toHaveBeenCalled();
});

test('reports expose a real retry state and never create a mood-record feature', async () => {
  const request = deferred();
  loadRecentAssessments.mockReturnValueOnce(request.promise);
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  act(() => component.root.findByProps({ className: 'home-recent-toggle' }).props.onClick());
  expect(textOf(component)).toContain('正在同步最近报告');
  await act(async () => { request.reject(new Error('offline')); });
  const error = component.root.findByType(StatePanel);
  expect(error.props.state).toBe('error');
  await act(async () => { await error.props.onAction(); });
  expect(textOf(component)).toContain('该成员暂无医学报告');
  expect(textOf(component)).not.toContain('心情打卡');
});

test('changing member rejects late reports from the previous member', async () => {
  const first = deferred();
  const second = deferred();
  loadRecentAssessments.mockImplementation(id => id === 'one' ? first.promise : second.promise);
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  await act(async () => {
    component.root.findByType('taro-picker').props.onChange({ detail: { value: 1 } });
  });
  act(() => component.root.findByProps({ className: 'home-recent-toggle' }).props.onClick());
  await act(async () => { second.resolve([{ id: 'new', scale_name: '第二位成员的报告', testee_id: 'two' }]); });
  expect(textOf(component)).toContain('第二位成员的报告');
  await act(async () => { first.resolve([{ id: 'old', scale_name: '第一位成员的报告', testee_id: 'one' }]); });
  expect(textOf(component)).not.toContain('第一位成员的报告');
  expect(textOf(component)).toContain('第二位成员的报告');
  // Store notifications for the same member must not erase the loaded report.
  await act(async () => { setTesteeList(members); });
  expect(textOf(component)).toContain('第二位成员的报告');
});


test('switching subjects updates the avatar and working category links together', async () => {
  setTesteeList([
    { id: 'adult', legalName: '成人', dob: '1990-01-01', gender: 1 },
    { id: 'child', legalName: '孩子', dob: '2020-01-01', gender: 2 },
  ]);
  setSelectedTesteeId('adult');
  const navigate = jest.spyOn(Taro, 'navigateTo');
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  expect(textOf(component)).toContain('心理健康');
  expect(textOf(component)).toContain('人格探索');
  await act(async () => { component.root.findByType('taro-picker').props.onChange({ detail: { value: 1 } }); });
  expect(textOf(component)).toContain('一起，读懂孩子的日常');
  expect(textOf(component)).toContain('注意与专注');
  expect(textOf(component)).not.toContain('人格探索');
  const cards = component.root.findAllByType(SurfaceCard).filter(card => card.props.className.startsWith('home-service '));
  act(() => cards[2].props.onClick());
  expect(navigate).toHaveBeenLastCalledWith({ url: expect.stringContaining('category=adhd') });
  const image = component.root.findByProps({ className: 'home-stage__figure' });
  act(() => image.props.onError());
  expect(textOf(component)).toContain('形象未加载，点击重试');
});
