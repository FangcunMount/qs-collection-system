import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import ScaleListPage from '../ScaleListPage';
import FilterChip from '@/shared/ui/FilterChip';
import ActionButton from '@/shared/ui/ActionButton';
import StatePanel from '@/shared/ui/StatePanel';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import SearchBox from '@/shared/ui/SearchBox';
import { listPublishedAssessmentModels } from '@/services/api/assessmentModelCatalogApi';
jest.mock('@/services/api/assessmentModelCatalogApi', () => ({ listPublishedAssessmentModels: jest.fn() }));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const response = (models, total = models.length, page_size = 20) => ({ data: { models, total, page_size } });
let tree;
const textOf = () => tree.root.findAllByType('taro-text').map(node => node.children.join('')).join('|');
const clickCategory = label => act(async () => {
  tree.root.findAllByType(FilterChip).find(chip => chip.props.children === label).props.onClick();
});
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(Taro, 'getCurrentInstance').mockReturnValue({ router: { params: {} } });
  listPublishedAssessmentModels.mockReset().mockResolvedValue(response([]));
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.restoreAllMocks(); });

test('late previous-category data cannot replace the current results or loading state', async () => {
  await act(async () => { tree = renderer.create(<ScaleListPage />); });
  const sleep = deferred(); const mood = deferred();
  listPublishedAssessmentModels.mockImplementation(({ category }) => category === 'slp' ? sleep.promise : mood.promise);
  await clickCategory('睡眠'); await clickCategory('情绪');
  await act(async () => { sleep.resolve(response([{ code: 'sleep', title: '旧睡眠量表', category: 'slp' }])); });
  expect(textOf()).not.toContain('旧睡眠量表'); expect(textOf()).toContain('正在加载量表');
  await act(async () => { mood.resolve(response([{ code: 'mood', title: '当前情绪量表', category: 'emt', reporters: ['parent'], applicable_ages: ['school_child'] }])); });
  expect(textOf()).toContain('当前情绪量表'); expect(textOf()).toContain('填写者 · 家长'); expect(textOf()).toContain('适用对象 · 学龄儿童');
  expect(textOf()).not.toContain('适合自评');
});

test('append failures preserve the current page and retry the same query, ignoring unconfirmed search drafts', async () => {
  Taro.getCurrentInstance.mockReturnValue({ router: { params: { category: 'slp' } } });
  listPublishedAssessmentModels.mockResolvedValueOnce(response([{ code: 'one', title: '第一页量表', category: 'slp' }], 2, 1));
  await act(async () => { tree = renderer.create(<ScaleListPage />); });
  act(() => tree.root.findByType(SearchBox).props.onInput({ detail: { value: '未确认的搜索词' } }));
  listPublishedAssessmentModels.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { tree.root.findByType(ActionButton).props.onClick(); });
  expect(textOf()).toContain('第一页量表'); expect(textOf()).toContain('后续量表加载失败');
  expect(listPublishedAssessmentModels.mock.calls.at(-1)[0]).toMatchObject({ category: 'slp', page: 2 });
  listPublishedAssessmentModels.mockResolvedValueOnce(response([{ code: 'two', title: '第二页量表', category: 'slp' }], 2, 1));
  await act(async () => { await tree.root.findByType(StatePanel).props.onAction(); });
  expect(textOf()).toContain('第一页量表'); expect(textOf()).toContain('第二页量表');
});

test('a new search clears old rows, returns an honest empty state and disables unpublished rows', async () => {
  listPublishedAssessmentModels.mockResolvedValue(response([{ code: 'draft', title: '未发布量表', status: 'draft', category: 'emt' }]));
  await act(async () => { tree = renderer.create(<ScaleListPage />); });
  const row = tree.root.findAllByType(SurfaceCard).find(card => card.props.className === 'scale-list-row');
  expect(row.props.onClick).toBeUndefined(); expect(textOf()).toContain('暂不可用');
  act(() => tree.root.findByType(SearchBox).props.onInput({ detail: { value: '不匹配的名称' } }));
  await act(async () => { tree.root.findByType(SearchBox).props.onConfirm(); });
  expect(textOf()).not.toContain('未发布量表'); expect(textOf()).toContain('暂无匹配量表');
});
