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
test('disabled capability hides entry and stale content retains a visible source notice', () => {
  model.state = { view: 'unavailable', output: { status: 'not_applicable', reason_code: 'feature_disabled', source_state: 'unknown' } };
  const entry = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />); expect(entry.toJSON()).toBeNull(); entry.unmount();
  model.state = { view: 'generated', output: { ...generated, source_state: 'stale' } };
  const detail = renderer.create(<AIExplanationPage />); expect(textOf(detail)).toContain('标准报告已更新'); expect(textOf(detail)).toContain(generated.content.limitations[0]); detail.unmount();
});
