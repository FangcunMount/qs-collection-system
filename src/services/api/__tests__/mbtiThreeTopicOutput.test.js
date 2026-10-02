import { parseWorkflowResult } from '../aiExplanationApi';
import { isMBTIThreeTopicOutput } from '../mbtiThreeTopicOutput';
import content from '../../../../scripts/test/fixtures/mbtiThreeTopicOutput.json';
jest.mock('../../servers', () => ({ request: jest.fn() }));
const requestId = '00000000-0000-4000-8000-000000000001';
const result = (value) => ({ request_id: requestId, status: 'completed', version: 5,
  artifact_id: 'artifact', report_id: '99', source_version: 'report-v1:101', content: value });
test('preserves the three-topic result and original provenance', () => {
  const output = parseWorkflowResult(result(content), requestId);
  expect(output.content).toEqual(content);
  expect(output.source_report_id).toBe('99');
  expect(output.source_state).toBe('unknown');
  expect(output.status).toBe('generated');
});
test.each([
  ['missing topic', (v) => v.sections.pop()],
  ['duplicate topic', (v) => { v.sections[1].topic = 'personality'; }],
  ['wrong scene', (v) => { v.scene_contract_version = 'mbti-single-assessment/v1'; }],
  ['reference as measured fact', (v) => { v.sections[0].insights[0].basis = 'report_fact'; }],
  ['missing reference', (v) => { v.sections[0].insights[0].reference_refs = []; }],
  ['cross-topic reference', (v) => { v.sections[0].insights[0].reference_refs = ['reference:career.ei.i']; }],
  ['invented source URL', (v) => { v.sections[0].insights[0].source_url = 'https://example.invalid'; }],
  ['unknown report axis', (v) => { v.summary.evidence_refs = [{ kind: 'dimension', ref: 'dimension:XY' }]; }],
  ['oversized content', (v) => { v.summary.content = 'x'.repeat(601); }],
])('fails closed before rendering: %s', (_name, mutate) => {
  const value = JSON.parse(JSON.stringify(content));
  mutate(value);
  expect(isMBTIThreeTopicOutput(value)).toBe(false);
  expect(() => parseWorkflowResult(result(value), requestId)).toThrow();
});
