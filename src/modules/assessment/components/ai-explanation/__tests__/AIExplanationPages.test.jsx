import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import ActionButton from '@/shared/ui/ActionButton';
import AIExplanationPage from '../../../pages/AIExplanationPage';
import AIExplanationEntryCard from '../AIExplanationEntryCard';
import { useAIExplanation } from '../../../hooks/useAIExplanation';
import { useMBTIReportSource } from '../../../hooks/useMBTIReportSource';
import { ready, pending, failed, generated } from '../../../../../../scripts/test/fixtures/aiExplanation';
jest.mock('../../../hooks/useAIExplanation', () => ({ useAIExplanation: jest.fn() }));
jest.mock('../../../hooks/useMBTIReportSource', () => ({ useMBTIReportSource: jest.fn() }));
let model;
beforeEach(() => {
  model = { state: { view: 'ready', output: ready }, visible: true, start: jest.fn(), refresh: jest.fn(), prepare: jest.fn() };
  useAIExplanation.mockImplementation(() => model);
  useMBTIReportSource.mockReturnValue({ report: null, loading: false });
  Taro.__setRouterParams({ aid: '101', t: '201' }); Taro.navigateTo = jest.fn();
});
const textOf = tree => JSON.stringify(tree.toJSON());
const click = (tree, label) => act(() => tree.root.findAllByType(ActionButton).find(button => button.props.children === label).props.onClick());

test('entry navigates with the report scope and never starts generation', () => {
  const tree = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />);
  click(tree, '请求深度解读'); expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/assessment/ai-explanation/index?aid=101&t=201' });
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('detail mount does not POST, only start button does', () => {
  const tree = renderer.create(<AIExplanationPage />); expect(model.start).not.toHaveBeenCalled();
  click(tree, '开始解读'); expect(model.start).toHaveBeenCalledTimes(1); tree.unmount();
});
test('pending has real waiting text and motion is optional', () => {
  model.state = { view: 'waiting', output: pending };
  const tree = renderer.create(<AIExplanationPage />); expect(textOf(tree)).toContain('请求已提交，等待开始');
  expect(textOf(tree)).not.toContain('ai-explanation--motion'); click(tree, '开启轻量动画');
  expect(textOf(tree)).toContain('ai-explanation--motion'); click(tree, '减少动画'); expect(textOf(tree)).not.toContain('ai-explanation--motion');
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('failed refresh does not call start; uncertain request requires preparation', () => {
  model.state = { view: 'failed', output: failed }; const tree = renderer.create(<AIExplanationPage />);
  click(tree, '刷新状态'); expect(model.refresh).toHaveBeenCalledTimes(1); expect(model.start).not.toHaveBeenCalled();
  model.state = { view: 'unconfirmed' }; act(() => tree.update(<AIExplanationPage />)); click(tree, '核对请求结果');
  expect(model.prepare).toHaveBeenCalledTimes(1); expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});
test('disabled capability explains availability without allowing generation', () => {
  model.state = { view: 'unavailable', output: { status: 'not_applicable', reason_code: 'feature_disabled', source_state: 'unknown' } };
  const entry = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />); expect(textOf(entry)).toContain('深度解读尚未开放');
  expect(entry.root.findAllByType(ActionButton)).toHaveLength(0);
  expect(model.start).not.toHaveBeenCalled(); entry.unmount();
});
test('stale content retains a visible source notice', () => {
  model.state = { view: 'generated', output: { ...generated, source_state: 'stale' } };
  const detail = renderer.create(<AIExplanationPage />); expect(textOf(detail)).toContain('标准报告已更新'); expect(textOf(detail)).toContain(generated.content.limitations[0]); detail.unmount();
});

test.each([
  ['source_not_supported', '本次报告暂不支持深度解读'],
  ['profile_unresolved', '本量表的深度解读暂未开放'],
  ['profile_mismatch', '本量表的深度解读暂未开放'],
  ['publication_missing', '本次报告的深度解读尚未开放'],
  ['publication_paused', '本次报告的深度解读已暂停'],
  ['source_incomplete', '本次报告暂无法生成深度解读'],
  ['source_conflict', '本次报告暂无法生成深度解读'],
  ['unsupported_model_version', '本次报告暂不支持深度解读'],
  ['asset_invalid', '深度解读配置暂不可用'],
  ['not_applicable', '本次报告暂无法提供深度解读'],
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
  click(entry, '请求深度解读');
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

test('ready explains the selected scope before the user submits', () => {
  const medical = renderer.create(<AIExplanationPage />);
  expect(textOf(medical)).toContain('维度之间的联系');
  expect(textOf(medical)).not.toContain('恋爱婚姻中的沟通与相处');
  expect(model.start).not.toHaveBeenCalled(); medical.unmount();
  Taro.__setRouterParams({ aid: '101', t: '201', kind: 'personality' });
  const mbti = renderer.create(<AIExplanationPage />);
  ['性格特征与自我理解', '职业发展探索', '恋爱婚姻中的沟通与相处'].forEach(topic => expect(textOf(mbti)).toContain(topic));
  expect(textOf(mbti)).toContain('不用于岗位适配或伴侣匹配定论');
  expect(model.start).not.toHaveBeenCalled(); mbti.unmount();
});

test('submitting disables the command while returning to the report remains possible', () => {
  model.state = { view: 'submitting' };
  const tree = renderer.create(<AIExplanationPage />);
  const submit = tree.root.findAllByType(ActionButton).find(button => button.props.children === '正在提交请求');
  expect(submit.props.disabled).toBe(true); expect(submit.props.loading).toBe(true);
  expect(submit.props.onClick).toBeUndefined();
  expect(tree.root.findAllByType(ActionButton).some(button => button.props.children === '返回标准报告')).toBe(true);
  expect(textOf(tree)).not.toContain('开始解读');
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});

test('waiting refresh reads the original request and never exposes a new-generation action', () => {
  model.state = { view: 'waiting', output: { ...pending, status: 'generating' } };
  const tree = renderer.create(<AIExplanationPage />);
  expect(textOf(tree)).toContain('解读正在生成');
  expect(textOf(tree)).toContain('停留在页面时自动核对状态');
  expect(textOf(tree)).toContain('离开页面不会取消已接收的请求');
  expect(textOf(tree)).not.toContain('开始解读');
  click(tree, '刷新状态');
  expect(model.refresh).toHaveBeenCalledTimes(1);
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});

test.each([
  ['waiting', pending, '解读正在生成 · 查看进度'],
  ['generated', generated, '查看深度解读'],
  ['failed', failed, '本次解读未完成 · 查看状态'],
])('report entry reopens the existing %s request in the same scope', (view, output, label) => {
  model.state = { view, output, requestId: pending.requestId };
  const tree = renderer.create(<AIExplanationEntryCard assessmentId="101" testeeId="201" />);
  click(tree, label);
  expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/assessment/ai-explanation/index?aid=101&t=201&gid=' + pending.requestId });
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});

test.each(['authRequired', 'forbidden', 'unsupported'])('%s only permits returning to the standard report', view => {
  model.state = { view };
  const tree = renderer.create(<AIExplanationPage />);
  expect(tree.root.findAllByType(ActionButton).map(button => button.props.children)).toEqual(['返回标准报告']);
  expect(model.start).not.toHaveBeenCalled(); tree.unmount();
});

test('preflight uses only verified report identity and discards it when source is unavailable', () => {
  Taro.__setRouterParams({ aid: '101', t: '201', kind: 'personality' });
  useMBTIReportSource.mockReturnValue({ report: { outcome: { code: 'ENFP' }, modelTitle: '16人格测评', testeeName: '示例小予', hero: { imageUrl: '/verified-character.png' } }, loading: false });
  const tree = renderer.create(<AIExplanationPage />);
  expect(useMBTIReportSource).toHaveBeenLastCalledWith({ assessmentId: '101', testeeId: '201' }, ready, true);
  expect(textOf(tree)).toContain('示例小予');
  expect(textOf(tree)).toContain('/verified-character.png');
  useMBTIReportSource.mockReturnValue({ report: null, loading: false });
  model.state = { view: 'ready', output: { ...ready, source_state: 'unknown' } };
  act(() => tree.update(<AIExplanationPage />));
  expect(textOf(tree)).not.toContain('示例小予');
  expect(textOf(tree)).not.toContain('/verified-character.png');
  expect(textOf(tree)).toContain('关联本次测评');
  model.state = { view: 'forbidden' }; act(() => tree.update(<AIExplanationPage />));
  expect(useMBTIReportSource).toHaveBeenLastCalledWith({ assessmentId: '101', testeeId: '201' }, undefined, false);
  tree.unmount();
});
