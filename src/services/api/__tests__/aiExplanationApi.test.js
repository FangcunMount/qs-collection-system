import { getAIExplanationCapability, requestAIExplanation, getAIExplanation, parseAIOutput } from '../aiExplanationApi';
import { request } from '../../servers';
import { ready, pending, generated } from '../../../../scripts/test/fixtures/aiExplanation';
jest.mock('../../servers', () => ({ request: jest.fn() }));
const scope = { assessmentId: '18446744073709551615', testeeId: '9007199254740993' };

test('three endpoints preserve string IDs, scope and fixed locale, and select safe request policy', async () => {
  request.mockResolvedValueOnce(ready).mockResolvedValueOnce(pending).mockResolvedValueOnce(generated);
  await getAIExplanationCapability(scope); await requestAIExplanation(scope); await getAIExplanation(scope, 'generation-1');
  expect(request.mock.calls.map(c => c[0])).toEqual([
    `/assessments/${scope.assessmentId}/ai-explanation/capability`, `/assessments/${scope.assessmentId}/ai-explanations`, `/assessments/${scope.assessmentId}/ai-explanations/generation-1`,
  ]);
  expect(request.mock.calls[1][1]).toEqual({ locale: 'zh-CN', focus_areas: [] });
  request.mock.calls.forEach(call => expect(call[2]).toMatchObject({ needToken: true, retry429: false, logPolicy: 'metadata_only', allowInteractiveLogin: false, params: { testee_id: scope.testeeId } }));
});
test.each([
  { ...generated, status: 'new_status' },
  { ...generated, source_state: 'new_source' },
  { ...generated, generation_id: 100 },
  { ...generated, content: { ...generated.content, schema_version: 'v2' } },
  { ...generated, content: { ...generated.content, limitations: undefined } },
  { ...generated, content: { ...generated.content, suggestions: [] } },
])('unsupported or incomplete responses do not render a success', value => {
  expect(() => parseAIOutput(value)).toThrow();
});
test('nullable empty source refs from Collection Go transport normalize only for low risk suggestions', () => {
  const content = { ...generated.content, suggestions: [{ ...generated.content.suggestions[0], source_suggestion_refs: null }] };
  expect(parseAIOutput({ ...generated, content }).content.suggestions[0].source_suggestion_refs).toEqual([]);
  expect(() => parseAIOutput({ ...generated, content: { ...content, suggestions: [{ ...content.suggestions[0], origin: 'standard_derived' }] } })).toThrow();
});
test('GET rejects a generation mismatch', async () => {
  request.mockResolvedValue(generated);
  await expect(getAIExplanation(scope, 'different-generation')).rejects.toThrow();
});
