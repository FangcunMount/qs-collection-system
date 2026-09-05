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

test('each domain opens its actual catalog', async () => {
  const navigate = jest.spyOn(Taro, 'navigateTo');
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  const cards = component.root.findAllByType(SurfaceCard)
    .filter(card => (card.props.className || '').includes('home-portal-card '));
  expect(cards).toHaveLength(3);
  for (const card of cards) card.props.onClick();
  expect(navigate.mock.calls.map(([arg]) => arg.url)).toEqual([
    expect.stringContaining('catalog-medical'),
    expect.stringContaining('catalog-personality'),
    expect.stringContaining('catalog-ability'),
  ]);
  expect(textOf(component)).toContain('当前成员 · 成员一');
  expect(textOf(component)).toContain('最近医学报告');
});

test('loading and retry states never become a fictitious mood-record feature', async () => {
  const request = deferred();
  listHotPublishedAssessmentModels.mockReturnValueOnce(request.promise);
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  expect(textOf(component)).toContain('正在加载测评');
  expect(textOf(component)).not.toContain('心情打卡');
  await act(async () => { request.reject(new Error('offline')); });
  const error = component.root.findAllByType(StatePanel).find(node => node.props.title === '测评加载失败');
  expect(error.props.state).toBe('error');
  await act(async () => { await error.props.onAction(); });
  expect(textOf(component)).toContain('暂无推荐测评');
  expect(textOf(component)).not.toContain('去记录');
});

test('changing member rejects late reports from the previous member', async () => {
  const first = deferred();
  const second = deferred();
  loadRecentAssessments.mockImplementation(id => id === 'one' ? first.promise : second.promise);
  await act(async () => { component = renderer.create(<HomeTabPage />); });
  await act(async () => {
    component.root.findByType('taro-picker').props.onChange({ detail: { value: 1 } });
  });
  await act(async () => { second.resolve([{ id: 'new', scale_name: '第二位成员的报告', testee_id: 'two' }]); });
  expect(textOf(component)).toContain('第二位成员的报告');
  await act(async () => { first.resolve([{ id: 'old', scale_name: '第一位成员的报告', testee_id: 'one' }]); });
  expect(textOf(component)).not.toContain('第一位成员的报告');
  expect(textOf(component)).toContain('第二位成员的报告');
  // Store notifications for the same member must not erase the loaded report.
  await act(async () => { setTesteeList(members); });
  expect(textOf(component)).toContain('第二位成员的报告');
});
