import { resolveAssessmentFillEntryParams } from '../assessmentFillEntry';
import { resolvePlanTaskEntry } from '@/services/api/planTaskEntries';
import { resolveAssessmentEntry } from '@/services/api/assessmentEntries';
import { buildAssessmentScanTargetUrl } from '@/shared/lib/entryScan';

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

  expect(resolvePlanTaskEntry).toHaveBeenCalledWith('42', token);
  expect(resolveAssessmentEntry).not.toHaveBeenCalled();
  expect(result).toEqual(expect.objectContaining({ task_id: '42', token, q: 'scale-1', t: '31', entry_status: 'active' }));
});

test('invalid or expired task entry cannot fall back to unverified URL parameters', async () => {
  resolvePlanTaskEntry.mockRejectedValue(new Error('task entry not found'));
  await expect(resolveAssessmentFillEntryParams({
    task_id: '42', token: 'a65f76c2-4d8e-4b8d-a0e6-a64b2d62e1c1', q: 'forged-scale',
  })).rejects.toThrow('task entry not found');
});

test('scanned task URL keeps both identities for server-side resolution', () => {
  const path = buildAssessmentScanTargetUrl({ result: 'https://collect.fangcunmount.cn/entry?token=token-1&task_id=42' });
  expect(path).toContain('token=token-1');
  expect(path).toContain('task_id=42');
});
