import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import SinglePageQuestionnaire from '../SinglePageQuestionnaire';
import QuestionnaireForm from '../QuestionnaireForm';
import QuestionnaireBottomActions from '../QuestionnaireBottomActions';
import QuestionRenderer from '../QuestionRenderer';
import StatePanel from '@/shared/ui/StatePanel';
import { getQuestionnaire } from '@/services/api/questionnaires';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
import { submitQuestionnaire } from '@/services/api/assessmentSubmissions';
jest.mock('@/services/api/questionnaires', () => ({ getQuestionnaire: jest.fn() }));
jest.mock('@/services/api/assessmentSubmissions', () => ({ submitQuestionnaire: jest.fn() }));
jest.mock('../QuestionRenderer', () => ({ __esModule: true, default: () => null }));
jest.mock('../WriterRoleDialog', () => ({ __esModule: true, default: () => null }));
jest.mock('../selectWriterRole', () => ({ __esModule: true, default: () => null }));
let tree;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const textOf = () => tree.root.findAllByType('taro-text').map(node => node.children.join('')).join('|');
const contract = { questionnaire_code: 'source-code', questionnaire_version: '2', testee_id: 'member' };
const questionnaire = { code: 'source-code', version: '2', title: '问卷原题', questions: [
  { code: 'q1', type: 'Text', title: '原题一', value: '原始答案' },
  { code: 'q2', type: 'Text', title: '选填题', value: '' },
] };
const createProps = () => ({ questionnaireCode: 'source-code', initialQuestionnaire: questionnaire, submitContract: contract, subSignid: '', writedCallback: jest.fn(), canSubmit: true });
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(Taro, 'showToast');
  submitQuestionnaire.mockReset();
  getQuestionnaire.mockReset().mockResolvedValue(questionnaire);
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.restoreAllMocks(); });

for (const [name, Page] of [['single', SinglePageQuestionnaire], ['full', QuestionnaireForm]]) {
  test(`${name}: in-flight submission is locked; uncertain retry preserves answers and attempt identity`, async () => {
    const props = createProps();
    await act(async () => { tree = renderer.create(<Page {...props} />); });
    if (name === 'single') {
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
      expect(textOf()).toContain('已填写 1 / 2 题');
      expect(textOf()).not.toContain('所有题目已完成');
    }
    const first = deferred(); submitQuestionnaire.mockReturnValueOnce(first.promise);
    let pending;
    act(() => { pending = tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    expect(tree.root.findByType(QuestionnaireBottomActions).props.submitting).toBe(true);
    await act(async () => { await tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    expect(submitQuestionnaire).toHaveBeenCalledTimes(1);
    expect(submitQuestionnaire.mock.calls[0][0]).toMatchObject({ code: 'source-code', version: '2', answers: [questionnaire.questions[0]] });
    const attempt = { idempotencyKey: 'same-attempt', requestId: 'request-1' };
    await act(async () => { first.reject(Object.assign(new Error('网络连接中断'), { submissionAttempt: attempt })); await pending; });
    expect(textOf()).toContain('提交未确认，可重试');
    expect(tree.root.findByType(QuestionnaireBottomActions).props.submitting).toBe(false);
    expect(props.writedCallback).not.toHaveBeenCalled();
    submitQuestionnaire.mockResolvedValueOnce({ id: 'answer-1', assessment_id: 'assessment-1', submission_attempt: attempt });
    await act(async () => { await tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    expect(submitQuestionnaire.mock.calls[1][4]).toEqual({ submitContract: contract, submissionAttempt: attempt });
    expect(submitQuestionnaire.mock.calls[1][0].answers).toEqual([questionnaire.questions[0]]);
    expect(props.writedCallback).toHaveBeenCalledWith('answer-1', 'assessment-1', '', expect.any(Object));
  });
}

test('single-choice auto-advance retains the raw option code and returning to it preserves the answer', async () => {
  jest.useFakeTimers();
  try {
    const data = { ...questionnaire, questions: [{ code: 'choice', type: 'Radio', options: [{ code: 'original-code' }] }, questionnaire.questions[1]] };
    await act(async () => { tree = renderer.create(<SinglePageQuestionnaire {...createProps()} initialQuestionnaire={data} />); });
    act(() => tree.root.findByType(QuestionRenderer).props.onChangeValue('original-code'));
    act(() => jest.advanceTimersByTime(250));
    expect(tree.root.findByType(QuestionRenderer).props.question.code).toBe('q2');
    act(() => tree.root.findByType(QuestionnaireBottomActions).props.onPrevious());
    expect(tree.root.findByType(QuestionRenderer).props.question.value).toBe('original-code');
  } finally { jest.useRealTimers(); }
});

for (const [name, Page] of [['single', SinglePageQuestionnaire], ['full', QuestionnaireForm]]) {
  test.each(['unmount', 'session-change', 'questionnaire-change'])(`${name}: a late submission after %s never navigates to the old report`, async (reason) => {
    const props = createProps();
    await act(async () => { tree = renderer.create(<Page {...props} />); });
    if (name === 'single') {
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
    }
    const request = deferred(); submitQuestionnaire.mockReturnValueOnce(request.promise);
    let pending;
    act(() => { pending = tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    if (reason === 'unmount') { act(() => tree.unmount()); tree = undefined; }
    else if (reason === 'session-change') act(() => clearPrivateSessionState());
    else act(() => tree.update(<Page {...props} initialQuestionnaire={{ ...questionnaire, code: 'replacement' }} />));
    await act(async () => { request.resolve({ id: 'old-answer', assessment_id: 'old-assessment' }); await pending; });
    expect(props.writedCallback).not.toHaveBeenCalled();
  });

  test(`${name}: an initial fetch failure has an actionable retry that loads the actual questions`, async () => {
    getQuestionnaire.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { tree = renderer.create(<Page {...createProps()} initialQuestionnaire={null} />); });
    expect(textOf()).toContain('问卷加载失败');
    await act(async () => { tree.root.findByType(StatePanel).props.onAction(); });
    expect(tree.root.findAllByType(QuestionRenderer)[0].props.question).toMatchObject(questionnaire.questions[0]);
    expect(textOf()).not.toContain('问卷加载失败');
  });
}

test('the questionnaire displays a non-blocking offline notice and removes it on reconnect', async () => {
  let networkChange;
  Taro.getNetworkType = jest.fn().mockResolvedValue({ networkType: 'none' });
  Taro.onNetworkStatusChange = jest.fn(callback => { networkChange = callback; });
  Taro.offNetworkStatusChange = jest.fn();
  try {
    await act(async () => { tree = renderer.create(<SinglePageQuestionnaire {...createProps()} />); });
    expect(textOf()).toContain('当前离线，可继续填写');
    act(() => tree.root.findByType(QuestionRenderer).props.onChangeValue('离线修改的答案'));
    expect(tree.root.findByType(QuestionRenderer).props.question.value).toBe('离线修改的答案');
    act(() => networkChange({ isConnected: true, networkType: 'wifi' }));
    expect(textOf()).not.toContain('当前离线');
    expect(tree.root.findByType(QuestionRenderer).props.question.value).toBe('离线修改的答案');
  } finally {
    act(() => tree.unmount()); tree = undefined;
    delete Taro.getNetworkType; delete Taro.onNetworkStatusChange; delete Taro.offNetworkStatusChange;
  }
});

for (const [name, Page] of [['single', SinglePageQuestionnaire], ['full', QuestionnaireForm]]) {
  test(`${name}: missing receipt is visibly uncertain and retry retains attempt identity`, async () => {
    const props = createProps();
    await act(async () => { tree = renderer.create(<Page {...props} />); });
    if (name === 'single') {
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
      act(() => tree.root.findByType(QuestionnaireBottomActions).props.onNext());
    }
    const attempt = { idempotencyKey: 'uncertain-receipt' };
    submitQuestionnaire.mockResolvedValueOnce({ submission_attempt: attempt });
    await act(async () => { await tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    expect(textOf()).toContain('提交未确认，可重试');
    expect(props.writedCallback).not.toHaveBeenCalled();
    submitQuestionnaire.mockResolvedValueOnce({ id: 'confirmed' });
    await act(async () => { await tree.root.findByType(QuestionnaireBottomActions).props.onSubmit(); });
    expect(submitQuestionnaire.mock.calls[1][4].submissionAttempt).toEqual(attempt);
    expect(props.writedCallback).toHaveBeenCalledTimes(1);
  });
}

test('replacing a questionnaire cancels the old choice auto-advance', async () => {
  jest.useFakeTimers();
  try {
    const props = createProps();
    const data = { ...questionnaire, questions: [{ code: 'choice', type: 'Radio', options: [{ code: 'raw' }] }, questionnaire.questions[1]] };
    await act(async () => { tree = renderer.create(<SinglePageQuestionnaire {...props} initialQuestionnaire={data} />); });
    act(() => tree.root.findByType(QuestionRenderer).props.onChangeValue('raw'));
    act(() => tree.update(<SinglePageQuestionnaire {...props} initialQuestionnaire={questionnaire} />));
    act(() => jest.advanceTimersByTime(250));
    expect(tree.root.findByType(QuestionRenderer).props.question.code).toBe('q1');
  } finally { jest.useRealTimers(); }
});
