import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import AssessmentReportPage from '../AssessmentReportPage';
import PersonalityReportPage from '../PersonalityReportPage';
import AssessmentReportTrendPage from '../AssessmentReportTrendPage';
import ReportPageShell from '../../components/report/ReportPageShell';
import MedicalReportOverview from '../../components/report/MedicalReportOverview';
import MedicalReportTrendSummary from '../../components/report/MedicalReportTrendSummary';
import BehaviorReportContent from '../../components/report/BehaviorReportContent';
import AIExplanationEntryCard from "../../components/ai-explanation/AIExplanationEntryCard";
import PersonalityReportContent from '../../components/report/PersonalityReportContent';
import StatePanel from '@/shared/ui/StatePanel';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
import { findTesteeById } from '@/shared/stores/testees';
import { loadMedicalReportByAssessmentId } from '../../services/loadMedicalReport';
import { loadBehaviorReportByAssessmentId } from '../../services/loadBehaviorReport';
import { loadPersonalityReportByAssessmentId, loadPersonalityReportByAnswerSheet } from '../../services/loadPersonalityReport';
import { getAssessmentTrendSummary } from '@/services/api/assessments';

jest.mock('@tarojs/taro', () => {
  const taro = jest.requireActual('@tarojs/taro');
  return { ...taro, __esModule: true, default: taro,
    useDidHide: callback => { mockOnHide = callback; },
    useDidShow: callback => { mockOnShow = callback; },
  };
});
jest.mock('@/shared/lib/logger', () => ({ getLogger: () => ({ RUN: jest.fn(), ERROR: jest.fn() }) }));
jest.mock('@/shared/stores/testees', () => ({ findTesteeById: jest.fn() }));
jest.mock('@/shared/stores/assessmentEntry', () => ({ getAssessmentEntryContext: () => null }));
jest.mock('@/services/api/assessments', () => ({ getAssessmentTrendSummary: jest.fn() }));
jest.mock('../../services/loadMedicalReport', () => ({ loadMedicalReportByAssessmentId: jest.fn(), loadMedicalReportByAnswerSheet: jest.fn() }));
jest.mock('../../services/loadBehaviorReport', () => ({ loadBehaviorReportByAssessmentId: jest.fn(), loadBehaviorReportByAnswerSheet: jest.fn() }));
jest.mock('../../services/loadPersonalityReport', () => ({ loadPersonalityReportByAssessmentId: jest.fn(), loadPersonalityReportByAnswerSheet: jest.fn() }));
jest.mock('../../components/report/ReportPageShell', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('@/shared/ui/PageShell', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('@/shared/ui/PlanSubscribeConfirm', () => ({ __esModule: true, default: () => null }));
jest.mock('@/shared/ui/PrivacyAuthorization', () => ({ PrivacyAuthorization: () => null }));
jest.mock('../../components/report/ReportCompletionAction', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/report/MedicalReportOverview', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/report/MedicalReportContent', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/report/MedicalReportTrendSummary', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/report/BehaviorReportContent', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/report/PersonalityReportContent', () => ({ __esModule: true, default: ({ supplement }) => supplement || null }));
jest.mock('../../components/report/TrendLineChart', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/ai-explanation/AIExplanationEntryCard', () => ({ __esModule: true, default: () => null }));

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let tree;
let params;
let mockOnHide, mockOnShow;
beforeEach(() => {
  params = { aid: 'old-assessment', t: 'old-member' };
  jest.spyOn(Taro, 'getCurrentInstance').mockImplementation(() => ({ router: { params } }));
  jest.spyOn(Taro, 'redirectTo').mockResolvedValue({});
  jest.spyOn(Taro, 'setNavigationBarTitle').mockResolvedValue({});
  getAssessmentTrendSummary.mockReset().mockResolvedValue({ meta: { comparable_count: 0 } });
  findTesteeById.mockReset().mockImplementation((id) => ({ id, legalName: `name:${id}` }));
  [loadMedicalReportByAssessmentId, loadBehaviorReportByAssessmentId, loadPersonalityReportByAssessmentId, loadPersonalityReportByAnswerSheet].forEach(mock => mock.mockReset());
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; jest.restoreAllMocks(); });
const cases = [
  ['medical', AssessmentReportPage, loadMedicalReportByAssessmentId, MedicalReportOverview],
  ['ability', AssessmentReportPage, loadBehaviorReportByAssessmentId, BehaviorReportContent],
  ['personality', PersonalityReportPage, loadPersonalityReportByAssessmentId, PersonalityReportContent],
];
const resultFor = (kind, id, member, report = {}) => kind === 'personality' ? report : { assessmentId: id, testeeId: member, report };

for (const [kind, Page, load, Content] of cases) {
  test(`${kind}: a superseded failure cannot end the newer loading state`, async () => {
    params.kind = kind;
    const old = deferred(), current = deferred();
    load.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await act(async () => { tree = renderer.create(<Page />); });
    params = { aid: 'new-assessment', t: 'new-member', kind };
    await act(async () => tree.update(<Page />));
    await act(async () => old.reject(new Error('old failure')));
    expect(tree.root.findByType(ReportPageShell).props).toMatchObject({ loading: true, error: '' });
    await act(async () => current.resolve(resultFor(kind, 'new-assessment', 'new-member')));
    expect(tree.root.findByType(Content).props.report.testeeName).toBe('name:new-member');
    expect(tree.root.findByType(ReportPageShell).props.loading).toBe(false);
  });

  test(`${kind}: a late old report cannot overwrite or redirect the current report`, async () => {
    params.kind = kind;
    const old = deferred(), current = deferred();
    load.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await act(async () => { tree = renderer.create(<Page />); });
    params = { aid: 'new-assessment', t: 'new-member', kind };
    await act(async () => tree.update(<Page />));
    await act(async () => current.resolve(resultFor(kind, 'new-assessment', 'new-member')));
    await act(async () => old.resolve(resultFor(kind, 'old-assessment', 'old-member', { model_extra: { type_code: 'INTJ' } })));
    expect(tree.root.findByType(Content).props.report.testeeName).toBe('name:new-member');
    expect(Taro.redirectTo).not.toHaveBeenCalled();
    if (kind === 'medical') expect(getAssessmentTrendSummary).toHaveBeenCalledTimes(1);
    if (kind === 'ability') expect(getAssessmentTrendSummary).not.toHaveBeenCalled();
  });

  test(`${kind}: session clearing removes visible data and rejects a pending retry`, async () => {
    params.kind = kind;
    load.mockResolvedValueOnce(resultFor(kind, 'old-assessment', 'old-member'));
    await act(async () => { tree = renderer.create(<Page />); });
    expect(tree.root.findByType(Content).props.report.testeeName).toBe('name:old-member');
    act(() => clearPrivateSessionState());
    expect(tree.root.findAllByType(Content)).toHaveLength(0);
    expect(tree.root.findByType(ReportPageShell).props.error).toContain('登录状态已变化');
    const pending = deferred(); load.mockReturnValueOnce(pending.promise);
    act(() => tree.root.findByType(ReportPageShell).props.onRetry());
    act(() => clearPrivateSessionState());
    await act(async () => pending.resolve(resultFor(kind, 'old-assessment', 'old-member')));
    expect(tree.root.findAllByType(Content)).toHaveLength(0);
    expect(tree.root.findByType(ReportPageShell).props.loading).toBe(false);
  });

  test(`${kind}: hidden pages discard late results and reload when shown again`, async () => {
    params.kind = kind;
    const pending = deferred();
    load.mockReturnValueOnce(pending.promise);
    await act(async () => { tree = renderer.create(<Page />); });
    act(() => mockOnHide());
    await act(async () => pending.resolve(resultFor(kind, 'old-assessment', 'old-member', { model_extra: { type_code: 'INTJ' } })));
    expect(findTesteeById).not.toHaveBeenCalled();
    expect(Taro.redirectTo).not.toHaveBeenCalled();
    load.mockResolvedValueOnce(resultFor(kind, 'old-assessment', 'old-member'));
    await act(async () => mockOnShow());
    expect(load).toHaveBeenCalledTimes(2);
    expect(tree.root.findByType(Content).props.report.testeeName).toBe('name:old-member');
  });

  test(`${kind}: unmount invalidates downstream effects of a late response`, async () => {
    params.kind = kind;
    const pending = deferred(); load.mockReturnValueOnce(pending.promise);
    await act(async () => { tree = renderer.create(<Page />); });
    act(() => tree.unmount()); tree = null;
    await act(async () => pending.resolve(resultFor(kind, 'old-assessment', 'old-member', { model_extra: { type_code: 'INTJ' } })));
    expect(findTesteeById).not.toHaveBeenCalled();
    expect(getAssessmentTrendSummary).not.toHaveBeenCalled();
    expect(Taro.redirectTo).not.toHaveBeenCalled();
  });
}

test('personality answersheet navigation uses the resolved member', async () => {
  params = { a: 'answersheet' };
  loadPersonalityReportByAnswerSheet.mockResolvedValue({ report: {}, testeeId: 'resolved-member', assessmentId: 'resolved-assessment' });
  await act(async () => { tree = renderer.create(<PersonalityReportPage />); });
  expect(tree.root.findByType(PersonalityReportContent).props.report.testeeName).toBe('name:resolved-member');
});

test('old medical trends cannot fill a different report or stop its trend loading', async () => {
  const old = deferred(), current = deferred();
  getAssessmentTrendSummary.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  loadMedicalReportByAssessmentId.mockImplementation(async ({ assessmentId, testeeId }) => ({ assessmentId, testeeId, report: {} }));
  await act(async () => { tree = renderer.create(<AssessmentReportPage />); });
  params = { aid: 'new-assessment', t: 'new-member' };
  await act(async () => tree.update(<AssessmentReportPage />));
  await act(async () => old.reject(new Error('old trend failure')));
  expect(tree.root.findByType(MedicalReportTrendSummary).props).toMatchObject({ summary: null, loading: true, error: '' });
  await act(async () => current.resolve({ meta: { comparable_count: 2 }, current: { total_score: 12 } }));
  expect(tree.root.findByType(MedicalReportTrendSummary).props).toMatchObject({ summary: { current: { total_score: 12 } }, loading: false, testeeId: 'new-member' });
});

test('full trend page guards route changes and clears rendered results on logout', async () => {
  const old = deferred(), current = deferred();
  getAssessmentTrendSummary.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  await act(async () => { tree = renderer.create(<AssessmentReportTrendPage />); });
  params = { aid: 'new-assessment', t: 'new-member' };
  await act(async () => tree.update(<AssessmentReportTrendPage />));
  await act(async () => old.reject(new Error('old failure')));
  expect(tree.root.findByType(StatePanel).props.state).toBe('loading');
  await act(async () => current.resolve({ current: { scale_name: 'current trend', submitted_at: '' }, meta: { comparable_count: 0 } }));
  expect(JSON.stringify(tree.toJSON())).toContain('current trend');
  act(() => clearPrivateSessionState());
  expect(JSON.stringify(tree.toJSON())).not.toContain('current trend');
  expect(tree.root.findByType(StatePanel).props.description).toContain('登录状态已变化');
});

test('a hidden full trend page rejects late results and fetches again on return', async () => {
  const pending = deferred();
  getAssessmentTrendSummary.mockReturnValueOnce(pending.promise);
  await act(async () => { tree = renderer.create(<AssessmentReportTrendPage />); });
  act(() => mockOnHide());
  await act(async () => pending.resolve({ current: { scale_name: 'late hidden result' } }));
  expect(JSON.stringify(tree.toJSON())).not.toContain('late hidden result');
  getAssessmentTrendSummary.mockResolvedValueOnce({ current: { scale_name: 'returned result' }, meta: { comparable_count: 0 } });
  await act(async () => mockOnShow());
  expect(JSON.stringify(tree.toJSON())).toContain('returned result');
});

test('personality answer-sheet entry uses the resolved assessment scope and clears AI access on logout', async () => {
  params = { a: 'sheet-1', t: '201' };
  loadPersonalityReportByAnswerSheet.mockResolvedValue({ report: {}, assessmentId: '101', testeeId: '201' });
  await act(async () => { tree = renderer.create(<PersonalityReportPage />); });
  expect(tree.root.findByType(AIExplanationEntryCard).props).toMatchObject({ assessmentId: '101', testeeId: '201', tone: 'personality' });
  act(() => clearPrivateSessionState());
  expect(tree.root.findAllByType(AIExplanationEntryCard)).toHaveLength(0);
});
test('late personality report cannot restore the old AI entry scope', async () => {
  params = { aid: '101', t: '201' };
  const old = deferred();
  loadPersonalityReportByAssessmentId.mockReturnValueOnce(old.promise).mockResolvedValueOnce({});
  await act(async () => { tree = renderer.create(<PersonalityReportPage />); });
  params = { aid: '102', t: '202' };
  await act(async () => tree.update(<PersonalityReportPage />));
  await act(async () => old.resolve({}));
  expect(tree.root.findByType(AIExplanationEntryCard).props).toMatchObject({ assessmentId: '102', testeeId: '202' });
});
