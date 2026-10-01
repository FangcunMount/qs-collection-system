import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import AssessmentFillPage from '../AssessmentFillPage';
import AssessmentReadyView from '../../views/AssessmentReadyView';
import AssessmentAnsweringView from '../../views/AssessmentAnsweringView';
import QuestionRenderer from '@/modules/questionnaire/components/QuestionRenderer';
import { getQuestionnaire } from '@/services/api/questionnaires';
import { loadPersonalitySessionForFill } from '../../lib/personalityQuestionnaire';
import { beginAnswering } from '../../services/answeringStart';
import { getTestee } from '@/services/api/testees';
import { resolveAssessmentFillEntryParams, redirectToEntryError } from '../../lib/assessmentFillEntry';
import { requestPlanSubscribe } from '@/shared/ui/PlanSubscribeConfirm';
import { setAssessmentEntryContext } from '@/shared/stores/assessmentEntry';

jest.mock('../../services/answeringStart', () => ({
  ...jest.requireActual('../../services/answeringStart'),
  beginAnswering: jest.fn(async (contract, origin) => ({ attempt: { requestKey: 'start-key' }, contract: { ...contract, answering_start_id: '901', origin_ref: origin } })),
}));
jest.mock('../../lib/personalityQuestionnaire', () => ({ loadPersonalitySessionForFill: jest.fn() }));
let mockLoad, mockReady;
let mockEntryContext = { task_id: 'old-task', entry_title: '旧入口' };
jest.mock('@tarojs/taro', () => {
  const taro = jest.requireActual('@tarojs/taro');
  return { ...taro, __esModule: true, default: taro, useLoad: fn => { mockLoad = fn; }, useReady: fn => { mockReady = fn; } };
});
jest.mock('@/shared/lib/logger', () => ({ getLogger: () => ({ RUN: jest.fn(), WARN: jest.fn() }) }));
jest.mock('@/shared/stores/assessmentEntry', () => ({ getAssessmentEntryContext: () => mockEntryContext, setAssessmentEntryContext: jest.fn(value => { mockEntryContext = value; }) }));
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
  mockLoad = undefined; mockReady = undefined; mockEntryContext = { task_id: 'old-task', entry_title: '旧入口' };
  loadPersonalitySessionForFill.mockResolvedValue({ questionnaireData: questionnaire('PERSONALITY'), submitContract: { questionnaire_code: 'PERSONALITY', questionnaire_version: '1', testee_id: 'member' } });
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

 test('failed start stays ready; retry obtains a start before exposing answers', async () => {
  beginAnswering.mockRejectedValueOnce(new Error('网络中断'));
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'A' }); await start();
  expect(tree.root.findAllByType(AssessmentAnsweringView)).toHaveLength(0);
  await start();
  expect(answering().submitContract.answering_start_id).toBe('901');
});
test('late start completion cannot enter the replacement page', async () => {
  const pending = deferred(); beginAnswering.mockReturnValueOnce(pending.promise);
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ q: 'A' });
  let starting; await act(async () => { starting = tree.root.findByType(AssessmentReadyView).props.onStart(); });
  await load({ q: 'B' });
  await act(async () => { pending.resolve({ attempt: {}, contract: { questionnaire_code: 'A', answering_start_id: '900' } }); await starting; });
  expect(tree.root.findAllByType(AssessmentAnsweringView)).toHaveLength(0);
  await start(); expect(answering().questionnaireCode).toBe('B');
});

test('personality automatic start waits for the server before showing questions', async () => {
  const pending = deferred(); beginAnswering.mockReturnValueOnce(pending.promise);
  await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
  await load({ model_code: 'MODEL', start: '1' });
  expect(tree.root.findAllByType(AssessmentAnsweringView)).toHaveLength(0);
  await act(async () => pending.resolve({ attempt: {}, contract: { questionnaire_code: 'PERSONALITY', answering_start_id: '902', testee_id: 'member' } }));
  expect(answering().submitContract.answering_start_id).toBe('902');
});

test('task-only entry pins exact question and model, and starts under the original task', async () => {
 resolveAssessmentFillEntryParams.mockResolvedValueOnce({ task_id: '42', t: 'member', testee_id: 'member', q: 'EXACT', questionnaire_version: '1', scale_code: 'MODEL', model_version: 'v2', entry_title: '机构任务' });
 await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
 await load({ task_id: '42', q: 'forged', mc: 'forged', t: '999', token: 'ae_forged' });
 expect(resolveAssessmentFillEntryParams).toHaveBeenCalledWith({ task_id: '42' });
 expect(getQuestionnaire).toHaveBeenCalledWith('EXACT', '1');
 await start();
 expect(beginAnswering).toHaveBeenLastCalledWith(expect.objectContaining({ questionnaire_code: 'EXACT', questionnaire_version: '1', model_code: 'MODEL', model_version: 'v2', testee_id: 'member' }), { type: 'plan_task', id: '42' }, null);
 expect(answering().submitContract.origin_ref).toEqual({ type: 'plan_task', id: '42' });
});

test('task entry rejects a questionnaire response from a different version', async () => {
 resolveAssessmentFillEntryParams.mockResolvedValueOnce({ task_id: '42', t: 'member', testee_id: 'member', q: 'EXACT', questionnaire_version: 'old-version', entry_title: '机构任务' });
 await act(async () => { tree = renderer.create(<AssessmentFillPage />); });
 await load({ task_id: '42' });
 expect(tree.root.findAllByType(AssessmentReadyView)).toHaveLength(0);
 expect(redirectToEntryError).toHaveBeenCalled();
});
