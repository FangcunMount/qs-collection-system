import { parseWorkflowResult } from '../aiExplanationApi';
import { isMBTIReferenceSelection } from '../mbtiReferences';
import artifact from '../../../../scripts/test/fixtures/mbtiThreeTopicArtifact.json';
jest.mock('../../servers', () => ({ request: jest.fn() }));
const id = '00000000-0000-4000-8000-000000000001';
const result = () => ({ request_id: id, status: 'completed', version: 5, artifact_id: artifact.id, report_id: '99',
  source_version: 'report-v1:101', content: JSON.parse(artifact.content_json),
  reference_material: JSON.parse(artifact.reference_material_json), reference_material_fingerprint: artifact.reference_material_fingerprint });
test('retains original selected reference bodies and fingerprint across workflow parsing', () => {
  const value = result();
  expect(parseWorkflowResult(value, id).reference_material).toEqual(value.reference_material);
  expect(parseWorkflowResult(value, id).reference_material_fingerprint).toBe(artifact.reference_material_fingerprint);
});
test('accepts the frozen exploration model version without rewriting its reference selection', () => {
  const value = result();
  value.reference_material.model_code = 'MBTI_FC_93';
  value.reference_material.model_version = 'v55-report-202608-v1';
  expect(isMBTIReferenceSelection(value.reference_material)).toBe(true);
  const parsed = parseWorkflowResult(value, id);
  expect(parsed.reference_material).toEqual(value.reference_material);
  expect(parsed.content).toEqual(value.content);
});
test.each([
  ['MBTI_FC_93', 'v64-report-202608-v1'],
  ['MBTI_OEJTS', 'v55-report-202608-v1'],
  ['MBTI_FC_93', 'future-version'],
])('rejects unsupported model-version pairs: %s@%s', (model, version) => {
  const value = result();
  Object.assign(value.reference_material, { model_code: model, model_version: version });
  expect(isMBTIReferenceSelection(value.reference_material)).toBe(false);
  expect(() => parseWorkflowResult(value, id)).toThrow();
});
test.each([
  ['missing source', m => { m.entries[0].source_ids = ['missing']; }],
  ['unselected pole', m => { m.entries[0].pole = 'E'; }],
  ['wrong model', m => { m.model_code = 'OTHER'; }],
  ['unsafe URL', m => { m.sources[0].url = 'javascript:alert(1)'; }],
  ['credential URL', m => { m.sources[0].url = 'https://secret@example.invalid'; }],
  ['empty boundary', m => { m.entries[0].usage_boundary = ''; }],
  ['missing coverage', m => { m.entries.pop(); }],
  ['HTML', m => { m.entries[0].content = '<script>bad</script>'; }]
])('rejects damaged frozen references for both models: %s', (_name, mutate) => {
  for (const [model, version] of [['MBTI_OEJTS', 'v64-report-202608-v1'], ['MBTI_FC_93', 'v55-report-202608-v1']]) {
    const value = result();
    Object.assign(value.reference_material, { model_code: model, model_version: version });
    mutate(value.reference_material);
    expect(isMBTIReferenceSelection(value.reference_material)).toBe(false);
    expect(() => parseWorkflowResult(value, id)).toThrow();
  }
});
test('requires a fingerprint and resolves each output reference against the original selection', () => {
  const value = result(); value.reference_material_fingerprint = 'broken';
  expect(() => parseWorkflowResult(value, id)).toThrow();
  const unresolved = result(); unresolved.content.sections[0].insights[0].reference_refs = ['reference:personality.missing'];
  expect(() => parseWorkflowResult(unresolved, id)).toThrow();
});
test('does not attach reference material to nonterminal views', () => {
  const value = result(); value.status = 'running'; delete value.content;
  expect(() => parseWorkflowResult(value, id)).toThrow();
});
