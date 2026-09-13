import { getAIExplanationCapability, requestAIExplanation, getAIExplanation, parseAIOutput } from '../aiExplanationApi';
import { request } from '../../servers';
import { ready, pending, generated } from '../../../../scripts/test/fixtures/aiExplanation';
jest.mock('../../servers', () => ({ request: jest.fn() }));
const scope = { assessmentId: '18446744073709551615', testeeId: '9007199254740993' };

const requestId = '00000000-0000-4000-8000-000000000001';
const source = { status: 'ready', report_id: '99', source_version: 'standard-v1:101' };
const completed = { status: 'completed', request_id: requestId, version: 3, artifact_id: generated.artifact_id, report_id: '99', source_version: 'standard-v1:101', content: generated.content };
test('new endpoints preserve immutable IDs and scoped request policy', async () => {
  request.mockResolvedValueOnce(source).mockResolvedValueOnce({ request_id: requestId, status: 'accepted' }).mockResolvedValueOnce(completed).mockResolvedValueOnce(source);
  await getAIExplanationCapability(scope);
  await requestAIExplanation(scope, { requestId, reportId: '99' });
  expect((await getAIExplanation(scope, requestId)).source_state).toBe('current');
  expect(request.mock.calls.map(c => c[0])).toEqual([
    `/assessments/${scope.assessmentId}/ai-workflows/source`, `/assessments/${scope.assessmentId}/ai-workflows`, `/assessments/${scope.assessmentId}/ai-workflows/${requestId}`, `/assessments/${scope.assessmentId}/ai-workflows/source`,
  ]);
  expect(request.mock.calls[1][1]).toEqual({ request_id: requestId, report_id: '99' });
  request.mock.calls.forEach(call => expect(call[2]).toMatchObject({ needToken: true, retry429: false, refreshOnForbidden: false, logPolicy: 'metadata_only', allowInteractiveLogin: false, params: { testee_id: scope.testeeId } }));
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

test('POST receipt mismatch and old Generation IDs are rejected', async () => {
 request.mockResolvedValue({request_id:'other',status:'accepted'});
 await expect(requestAIExplanation(scope,{requestId,reportId:'99'})).rejects.toThrow();
 request.mockClear();
 await expect(getAIExplanation(scope,'123456')).rejects.toThrow();
 expect(request).not.toHaveBeenCalled();
});
test.each(['queued','running','blocked','cancelled'])('workflow %s maps to participant state without inventing output',async status=>{
 request.mockResolvedValue({request_id:requestId,status,version:2});
 const output=await getAIExplanation(scope,requestId);
 expect(output.status).toBe({queued:'pending',running:'generating',blocked:'failed',cancelled:'failed'}[status]);
 expect(output.content).toBeUndefined();
 expect(request).toHaveBeenCalledTimes(1);
});
test.each([{...completed,version:-1},{...completed,version:0},{...completed,report_id:99},{...completed,source_version:''},{...completed,request_id:'other'},{...completed,status:'awaiting_answer'}])('invalid workflow result fails closed',async value=>{
 request.mockResolvedValue(value);
 await expect(getAIExplanation(scope,requestId)).rejects.toThrow();
});
test('source comparison detects changed reports and access withdrawal',async()=>{
 request.mockResolvedValueOnce(completed).mockResolvedValueOnce({...source,report_id:'100'});
 expect((await getAIExplanation(scope,requestId)).source_state).toBe('stale');
 request.mockResolvedValueOnce(completed).mockRejectedValueOnce({statusCode:403});
 await expect(getAIExplanation(scope,requestId)).rejects.toMatchObject({statusCode:403});
});
test('unavailable current source is never labeled current',async()=>{
 request.mockResolvedValueOnce(completed).mockRejectedValueOnce({statusCode:503});
 expect((await getAIExplanation(scope,requestId)).source_state).toBe('unavailable');
});
