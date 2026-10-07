import { resolveAssessmentFillEntryParams } from '../assessmentFillEntry';
import { resolvePlanTaskEntry } from '@/services/api/planTaskEntries';
import { resolveAssessmentEntry } from '@/services/api/assessmentEntries';

jest.mock('@/services/api/planTaskEntries', () => ({ resolvePlanTaskEntry: jest.fn() }));
jest.mock('@/services/api/assessmentEntries', () => ({ resolveAssessmentEntry: jest.fn() }));

beforeEach(() => {
  resolvePlanTaskEntry.mockReset();
  resolveAssessmentEntry.mockReset();
});

test('task reminder resolves the current scale and exact testee before filling', async () => {
  const token = 'a65f76c2-4d8e-4b8d-a0e6-a64b2d62e1c1';
  resolvePlanTaskEntry.mockResolvedValue({ task_id: '42', testee_id: '31', q: 'scale-1', entry_status: 'active' });

  const result = await resolveAssessmentFillEntryParams({ task_id: '42', token });

  expect(resolvePlanTaskEntry).toHaveBeenCalledWith('42');
  expect(resolveAssessmentEntry).not.toHaveBeenCalled();
  expect(result).toEqual(expect.objectContaining({ task_id: '42', q: 'scale-1', t: '31', entry_status: 'active' }));
});

test('invalid or expired task entry cannot fall back to unverified URL parameters', async () => {
  resolvePlanTaskEntry.mockRejectedValue(new Error('task entry not found'));
  await expect(resolveAssessmentFillEntryParams({
    task_id: '42', token: 'a65f76c2-4d8e-4b8d-a0e6-a64b2d62e1c1', q: 'forged-scale',
  })).rejects.toThrow('task entry not found');
});

test('task ID alone overrides forged question, model, profile and doctor tokens', async () => {
 resolvePlanTaskEntry.mockResolvedValue({ task_id: '42', testee_id: '31', q: 'frozen-question', questionnaire_version: 'v1' });
 const result = await resolveAssessmentFillEntryParams({ task_id: '42', token: 'ae_forged', q: 'forged', mc: 'forged', t: '999', sp: '1' });
 expect(resolvePlanTaskEntry).toHaveBeenCalledWith('42');
 expect(resolveAssessmentEntry).not.toHaveBeenCalled();
 expect(result).toEqual(expect.objectContaining({ q: 'frozen-question', t: '31', questionnaire_version: 'v1' }));
 expect(result.token).toBeUndefined(); expect(result.mc).toBeUndefined(); expect(result.sp).toBeUndefined();
});
test('task ID alone resolves from a launch scene', async () => {
 resolvePlanTaskEntry.mockResolvedValue({ task_id: '42', testee_id: '31', q: 'q' });
 await resolveAssessmentFillEntryParams({ scene: 'task_id=42' });
 expect(resolvePlanTaskEntry).toHaveBeenCalledWith('42');
});

test('a Task entry cannot be redirected to a forged alternate scene', async () => {
 resolvePlanTaskEntry.mockResolvedValue({ task_id: '42', testee_id: '31', q: 'frozen-question' });
 const result = await resolveAssessmentFillEntryParams({ task_id: '42', scene: 'ae_forged' });
 expect(resolvePlanTaskEntry).toHaveBeenCalledWith('42');
 expect(resolveAssessmentEntry).not.toHaveBeenCalled();
 expect(result).toEqual(expect.objectContaining({ task_id: '42', q: 'frozen-question', t: '31' }));
 expect(result.scene).toBeUndefined();
});
