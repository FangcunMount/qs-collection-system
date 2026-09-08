import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import AssessmentFillPage from '../AssessmentFillPage';
import AssessmentReadyView from '../../views/AssessmentReadyView';
import AssessmentAnsweringView from '../../views/AssessmentAnsweringView';
import QuestionRenderer from '@/modules/questionnaire/components/QuestionRenderer';
import { getQuestionnaire } from '@/services/api/questionnaires';
import { getTestee } from '@/services/api/testees';
import { resolveAssessmentFillEntryParams, redirectToEntryError } from '../../lib/assessmentFillEntry';
import { requestPlanSubscribe } from '@/shared/ui/PlanSubscribeConfirm';
import { setAssessmentEntryContext } from '@/shared/stores/assessmentEntry';

let mockLoad, mockReady;
jest.mock('@tarojs/taro', () => {
  const taro = jest.requireActual('@tarojs/taro');
  return { ...taro, __esModule: true, default: taro, useLoad: fn => { mockLoad = fn; }, useReady: fn => { mockReady = fn; } };
});
jest.mock('@/shared/lib/logger', () => ({ getLogger: () => ({ RUN: jest.fn(), WARN: jest.fn() }) }));
jest.mock('@/shared/stores/assessmentEntry', () => ({ getAssessmentEntryContext: () => ({ task_id: 'old-task', entry_title: '旧入口' }), setAssessmentEntryContext: jest.fn() }));
jest.mock('@/shared/stores/testees', () => ({
  getSelectedTesteeId: () => 'member', getTesteeList: () => [{ id: 'member', legalName: '成员' }],
  refreshTesteeList: jest.fn(async () => {}), setSelectedTesteeId: jest.fn(),
  subscribeTesteeStore: fn => { fn({ testeeList: [{ id: 'member' }], selectedTesteeId: 'member' }); return () => {}; },
}));
jest.mock('@/services/api/questionnaires', () => ({ getQuestionnaire: jest.fn() }));
jest.mock('@/services/api/testees', () => ({ getTestee: jest.fn() }));
jest.mock('@/shared/ui/PrivacyAuthorization', () => ({ PrivacyAuthorization: () => null }));
jest.mock('@/shared/ui/PlanSubscribeConfirm', () => ({ requestPlanSubscribe: jest.fn(async () => ({ status: 'skipped' })) }));
jest.mock('../../views/AssessmentReadyView', () => ({ __esModule: true, default: () => null }));
jest.mock('../../lib/assessmentFillEntry', () => ({
  ...jest.requireActual('../../lib/assessmentFillEntry'), resolveAssessmentFillEntryParams: jest.fn(async p => p), redirectToEntryError: jest.fn(),
}));
const questionnaire = code => ({ code, version: '1', title: `量表${code}`, type: 'MedicalScale', questions: [{ code: 'q1', type: 'Text', title: `${code}的题目` }] });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let tree;
beforeEach(() => {
  mockLoad = undefined; mockReady = undefined;
  Taro.__setRouterParams({ q: 'A' });
  getQuestionnaire.mockReset().mockImplementation(async code => questionnaire(code));
  getTestee.mockReset().mockResolvedValue({ id: 'member', legalName: '成员' });
  resolveAssessmentFillEntryParams.mockReset().mockImplementation(async p => p);
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; });
const load = async params => { await act(async () => { mockLoad?.(params); }); await act(async () => { mockReady?.(); }); };
const start = async () => { await act(async () => tree.root.findByType(AssessmentReadyView).props.onStart()); };
const answering = () => tree.root.findByType(AssessmentAnsweringView).props.viewModel;

test('page load parameters take precedence over a cached router from the previous scale', async () => {
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'B' }); await start();
  expect(getQuestionnaire).toHaveBeenCalledWith('B');
  expect(answering().questionnaire.questions[0].title).toBe('B的题目');
  expect(tree.root.findByType(QuestionRenderer).props.question.title).toBe('B的题目');
  expect(answering().submitContract.questionnaire_code).toBe('B');
  expect(requestPlanSubscribe.mock.calls.at(-1)[0].taskId).toBe('');
});
test('switching scales clears the previous answering state while the new questionnaire loads', async () => {
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'A', sp: '1', signid: 'old-sign' }); await start();
  act(() => tree.root.findByType(QuestionRenderer).props.onChangeValue('A的答案'));
  expect(tree.root.findByType(QuestionRenderer).props.question.value).toBe('A的答案');
  const pending = deferred(); getQuestionnaire.mockReturnValueOnce(pending.promise);
  await load({ q: 'B' });
  expect(tree.root.findAllByType(AssessmentAnsweringView)).toHaveLength(0);
  await act(async () => pending.resolve(questionnaire('B'))); await start();
  expect(tree.root.findByType(QuestionRenderer).props.question).toMatchObject({ title: 'B的题目' });
  expect(tree.root.findByType(QuestionRenderer).props.question.value).toBeUndefined();
  expect(answering()).toMatchObject({ questionnaireCode: 'B', subSignid: '', questionnaire: { code: 'B' }, submitContract: { questionnaire_code: 'B' } });
});
test('a late response from the old scale cannot replace the new questions', async () => {
  const old = deferred(); getQuestionnaire.mockReturnValueOnce(old.promise);
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'A' }); await load({ q: 'B' });
  await act(async () => old.resolve(questionnaire('A'))); await start();
  expect(answering().questionnaire.code).toBe('B');
});
test('a late old entry resolution cannot load content or overwrite entry context', async () => {
  const old = deferred(); resolveAssessmentFillEntryParams.mockReturnValueOnce(old.promise);
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ scene: 'old-scene' }); await load({ q: 'B' });
  await act(async () => old.resolve({ q: 'A', entry_title: '迟到旧入口' }));
  expect(getQuestionnaire.mock.calls.map(([code]) => code)).toEqual(['B']);
  expect(setAssessmentEntryContext).not.toHaveBeenCalledWith(expect.objectContaining({ entry_title: '迟到旧入口' }));
});

test('an old entry failure cannot redirect away from the current scale', async () => {
  const old = deferred(); resolveAssessmentFillEntryParams.mockReturnValueOnce(old.promise);
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ scene: 'old-scene' }); await load({ q: 'B' });
  await act(async () => old.reject(new Error('expired old entry')));
  expect(redirectToEntryError).not.toHaveBeenCalled();
  await start(); expect(answering().questionnaire.code).toBe('B');
});
test('leaving a filling page ignores its late submission callback', async () => {
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'A' }); await start(); const oldWritten = answering().onWritten;
  const redirect = jest.spyOn(Taro, 'redirectTo');
  await load({ q: 'B' }); await act(async () => oldWritten('old-answer', 'old-assessment', 'old-request'));
  expect(redirect).not.toHaveBeenCalled(); redirect.mockRestore();
});
