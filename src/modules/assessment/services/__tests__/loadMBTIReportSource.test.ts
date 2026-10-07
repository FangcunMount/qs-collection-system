import { getPersonalityReport } from '@/services/api/personality';
import { getAIExplanationCapability } from '@/services/api/aiExplanationApi';
import { createRequestLifetime } from '@/services/requestLifetime';
import { loadMBTIReportSource } from '../loadMBTIReportSource';

jest.mock('@/services/api/personality', () => ({ getPersonalityReport: jest.fn() }));
jest.mock('@/services/api/aiExplanationApi', () => ({ getAIExplanationCapability: jest.fn() }));
const getReport = getPersonalityReport as jest.Mock;
const getSource = getAIExplanationCapability as jest.Mock;
const scope = { assessmentId: '101', testeeId: '201' };
const report = { assessment_id: '101', testee_id: '201', model: { code: 'MBTI_FC_93', title: '探索版', version: 'v55' },
  model_extra: { type_code: 'ENFP', image_url: 'https://example.com/ENFP.png' }, dimensions: [] };
beforeEach(() => { getReport.mockResolvedValue(report); getSource.mockResolvedValue({ source_report_id: '99', source_state: 'current' }); });

test('reads the original character and validates the source after reading without starting a model call', async () => {
  const lifetime = createRequestLifetime();
  const result = await loadMBTIReportSource(scope, '99', undefined, lifetime);
  expect(result?.hero.imageUrl).toBe(report.model_extra.image_url);
  expect(result?.outcome.code).toBe('ENFP');
  expect(getReport).toHaveBeenCalledWith({ ...scope, lifetime });
  expect(getSource.mock.invocationCallOrder[0]).toBeGreaterThan(getReport.mock.invocationCallOrder[0]);
});
test.each([
  [{ ...report, assessment_id: 'other' }],
  [{ ...report, testee_id: 'other' }],
  [{ ...report, model: { code: 'BIG5' } }],
])('does not present mismatched report identity', async (raw) => {
  getReport.mockResolvedValue(raw);
  expect(await loadMBTIReportSource(scope, '99', undefined, createRequestLifetime())).toBeNull();
});
test('does not use the latest report to replace an old AI source', async () => {
  getSource.mockResolvedValue({ source_report_id: '100', source_state: 'current' });
  expect(await loadMBTIReportSource(scope, '99', undefined, createRequestLifetime())).toBeNull();
});
test('does not present a different model version or type from the frozen reference selection', async () => {
  const artifact = require('../../../../../scripts/test/fixtures/mbtiThreeTopicArtifact.json');
  const references = { ...JSON.parse(artifact.reference_material_json), model_code: 'MBTI_FC_93', model_version: 'v55', type_code: 'ENFP' };
  expect(await loadMBTIReportSource(scope, '99', references, createRequestLifetime())).not.toBeNull();
  for (const mismatch of [{ model_version: 'v56' }, { model_code: 'MBTI_OEJTS' }, { type_code: 'INTJ' }]) {
    expect(await loadMBTIReportSource(scope, '99', { ...references, ...mismatch }, createRequestLifetime())).toBeNull();
  }
});
test('canceled reads do not continue checking the source', async () => {
  const lifetime = createRequestLifetime(); lifetime.cancel();
  expect(await loadMBTIReportSource(scope, '99', undefined, lifetime)).toBeNull();
  expect(getSource).not.toHaveBeenCalled();
});
