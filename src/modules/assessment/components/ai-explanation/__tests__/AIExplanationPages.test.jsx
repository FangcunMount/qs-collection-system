import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import ActionButton from '@/shared/ui/ActionButton';
import AIExplanationPage from '../../../pages/AIExplanationPage';
import AIExplanationEntryCard from '../AIExplanationEntryCard';
import { useAIExplanation } from '../../../hooks/useAIExplanation';
import { ready, pending, failed, generated } from '../../../../../../scripts/test/fixtures/aiExplanation';
jest.mock('../../../hooks/useAIExplanation', () => ({ useAIExplanation: jest.fn() }));
let model;
beforeEach(() => {
  model = { state: { view: 'ready', output: ready }, visible: true, start: jest.fn(), refresh: jest.fn(), prepare: jest.fn() };
  useAIExplanation.mockImplementation(() => model);
  Taro.__setRouterParams({ aid: '101', t: '201' }); Taro.navigateTo = jest.fn();
});
const textOf = tree => JSON.stringify(tree.toJSON());
const click = (tree, label) => act(() => tree.root.findAllByType(ActionButton).find(button => button.props.children === label).props.onClick());

test('entry navigates with the report scope and never starts generation', () => {
  const tree = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />);
  click(tree, '请求 AI 解读'); expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/assessment/ai-explanation/index?aid=101&t=201' });
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('detail mount does not POST, only start button does', () => {
  const tree = renderer.create(<AIExplanationPage />); expect(model.start).not.toHaveBeenCalled();
  click(tree, '开始解读'); expect(model.start).toHaveBeenCalledTimes(1); tree.unmount();
});
test('pending has real waiting text and motion is optional', () => {
  model.state = { view: 'waiting', output: pending };
  const tree = renderer.create(<AIExplanationPage />); expect(textOf(tree)).toContain('请求已接收，等待开始');
  expect(textOf(tree)).not.toContain('ai-explanation--motion'); click(tree, '开启轻量动画');
  expect(textOf(tree)).toContain('ai-explanation--motion'); click(tree, '减少动画'); expect(textOf(tree)).not.toContain('ai-explanation--motion');
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('failed refresh does not call start; uncertain request requires preparation', () => {
  model.state = { view: 'failed', output: failed }; const tree = renderer.create(<AIExplanationPage />);
  click(tree, '刷新状态'); expect(model.refresh).toHaveBeenCalledTimes(1); expect(model.start).not.toHaveBeenCalled();
  model.state = { view: 'unconfirmed' }; act(() => tree.update(<AIExplanationPage />)); click(tree, '再次请求');
  expect(model.prepare).toHaveBeenCalledTimes(1); expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('disabled capability explains availability without allowing generation', () => {
  model.state = { view: 'unavailable', output: { status: 'not_applicable', reason_code: 'feature_disabled', source_state: 'unknown' } };
  const entry = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />); expect(textOf(entry)).toContain('AI 解读尚未开放');
  expect(entry.root.findAllByType(ActionButton)).toHaveLength(0);
  expect(model.start).not.toHaveBeenCalled(); entry.unmount();
});
test('stale content retains a visible source notice', () => {
  model.state = { view: 'generated', output: { ...generated, source_state: 'stale' } };
  const detail = renderer.create(<AIExplanationPage />); expect(textOf(detail)).toContain('标准报告已更新'); expect(textOf(detail)).toContain(generated.content.limitations[0]); detail.unmount();
});

test.each([
  ['source_not_supported', '本次报告暂不支持 AI 解读'],
  ['profile_unresolved', '本量表的 AI 解读暂未开放'],
  ['profile_mismatch', '本量表的 AI 解读暂未开放'],
  ['not_applicable', '本次报告暂无法提供 AI 解读'],
])('unavailable reason %s is visible without a misleading request action', (reason, copy) => {
  model.state = { view: 'unavailable', output: { status: 'not_applicable', reason_code: reason, source_state: 'current' } };
  const entry = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />);
  expect(textOf(entry)).toContain(copy);
  expect(textOf(entry)).not.toContain(reason);
  expect(entry.root.findAllByType(ActionButton)).toHaveLength(0);
  expect(model.start).not.toHaveBeenCalled(); entry.unmount();
});
test('personality entry retains its report kind and detail can return from a direct link', () => {
  const entry = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" tone="personality" />);
  click(entry, '请求 AI 解读');
  expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/assessment/ai-explanation/index?aid=101&t=201&kind=personality' });
  entry.unmount();
  Taro.__setRouterParams({ aid: '101', t: '201', kind: 'personality' });
  const originalPages = Taro.getCurrentPages;
  Taro.getCurrentPages = jest.fn(() => []);
  const redirect = jest.spyOn(Taro, 'redirectTo').mockResolvedValue({});
  const detail = renderer.create(<AIExplanationPage />);
  click(detail, '返回标准报告');
  expect(redirect).toHaveBeenCalledWith({ url: '/pages/assessment/personality-report/index?aid=101&t=201' });
  expect(model.start).not.toHaveBeenCalled(); detail.unmount(); Taro.getCurrentPages = originalPages; redirect.mockRestore();
});
