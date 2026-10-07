import { getAIExplanationCapability, requestAIExplanation, getAIExplanation, validateExplanationView } from '../aiExplanationApi';
import { request } from '../../servers';
import { ready, pending, generated } from '../../../../scripts/test/fixtures/aiExplanation';
jest.mock('../../servers', () => ({ request: jest.fn() }));
const scope = { assessmentId: '18446744073709551615', testeeId: '9007199254740993' };

const requestId = '00000000-0000-4000-8000-000000000001';
const source = { status: 'ready', report_id: '99', source_version: 'standard-v1:101', ai_eligibility: { status: 'available' } };
const completed = { status: 'completed', request_id: requestId, version: 3, artifact_id: generated.artifact_id, report_id: '99', source_version: 'standard-v1:101', content: generated.content };
const submitted = { request_id: requestId, status: 'submitted', operation_id: requestId, command_id: requestId,
  status_url: `/api/v1/interpretation/ai-workflow/operations/${requestId}?testee_id=${scope.testeeId}&assessment_id=${scope.assessmentId}&request_id=${requestId}` };
const operation = { operation_id: requestId, command_id: requestId, resource_id: requestId, status: 'submitted', transport_status: 'awaiting_receipt' };
test('MQ submission waits for the original authorized workflow without resending or inventing business acceptance', async () => {
  request.mockResolvedValueOnce(submitted)
    .mockResolvedValueOnce({ request_id: requestId, status: 'accepted', version: 0 })
    .mockResolvedValueOnce(operation)
    .mockResolvedValueOnce({ request_id: requestId, status: 'running', version: 2 })
    .mockResolvedValueOnce(completed).mockResolvedValueOnce(source);
  const output = await requestAIExplanation(scope, { requestId, reportId: '99' });
  expect(output).toMatchObject({ status: 'pending', requestId, workflow_version: 0 });
  expect(output.content).toBeUndefined();
  expect((await getAIExplanation(scope, requestId)).status).toBe('pending');
  expect((await getAIExplanation(scope, requestId)).status).toBe('generating');
  expect((await getAIExplanation(scope, requestId)).status).toBe('generated');
  expect(request.mock.calls.filter(call => call[2].method === 'POST')).toHaveLength(1);
  expect(request.mock.calls.filter(call => call[0] === `/assessments/${scope.assessmentId}/ai-workflows/${requestId}`)).toHaveLength(3);
});

test('missing workflow queries the scoped original operation with GET only', async () => {
  const lifetime = { isActive: () => true };
  request.mockRejectedValueOnce({ statusCode: 404 }).mockResolvedValueOnce(operation);
  expect(await getAIExplanation(scope, requestId, lifetime)).toMatchObject({ status: 'pending', submission_state: 'submitted', requestId });
  expect(request.mock.calls[1]).toEqual([`/interpretation/ai-workflow/operations/${requestId}`, {}, expect.objectContaining({
    method: 'GET', lifetime, retry429: false, allowInteractiveLogin: false,
    params: { testee_id: scope.testeeId, assessment_id: scope.assessmentId, request_id: requestId },
  })]);
  expect(request.mock.calls.every(call => call[2].method === 'GET')).toBe(true);
});
test('a confirmed business refusal stops waiting without rendering receipt text or resending', async () => {
  request.mockResolvedValueOnce({ request_id: requestId, status: 'accepted', version: 0 })
    .mockResolvedValueOnce({ ...operation, status: 'rejected', decision: 'rejected', transport_status: 'confirmed',
      code: 'private-provider-text', receipt: { sensitive: 'private-content' } });
  const result = await getAIExplanation(scope, requestId);
  expect(result).toMatchObject({ status: 'failed', submission_state: 'rejected', failure: { code: 'submission_rejected', retryable: false } });
  expect(JSON.stringify(result)).not.toMatch(/private-/);
  expect(request).toHaveBeenCalledTimes(2);
});
test.each([
  { ...operation, transport_status: 'staged' },
  { ...operation, status: 'accepted', decision: 'accepted', transport_status: 'confirmed' },
])('transport or admission confirmation never implies generation or an artifact', async value => {
  request.mockRejectedValueOnce({ statusCode: 404 }).mockResolvedValueOnce(value);
  const result = await getAIExplanation(scope, requestId);
  expect(result.status).toBe('pending'); expect(result.content).toBeUndefined(); expect(result.artifact_id).toBeUndefined();
});
test.each([
  { ...operation, transport_status: 'held' },
  { ...operation, status: 'held', decision: 'held', transport_status: 'held' },
])('technical holds remain unresolved, rather than a business refusal', async value => {
  request.mockRejectedValueOnce({ statusCode: 404 }).mockResolvedValueOnce(value);
  expect(await getAIExplanation(scope, requestId)).toMatchObject({ status: 'pending', submission_state: 'held' });
});
test.each([
  { ...operation, operation_id: 'other' }, { ...operation, command_id: 'other' },
  { ...operation, resource_id: 'other' }, { ...operation, resource_id: undefined },
  { ...operation, status: 'published' }, { ...operation, transport_status: 'unknown' },
  { ...operation, decision: false }, { ...operation, decision: 'rejected' },
  { ...operation, status: 'accepted', decision: 'accepted' },
  { ...operation, status: 'rejected', decision: 'rejected' },
  { ...operation, transport_status: 'confirmed' },
])('an unverified operation cannot drive participant status', async value => {
  request.mockRejectedValueOnce({ statusCode: 404 }).mockResolvedValueOnce(value);
  await expect(getAIExplanation(scope, requestId)).rejects.toThrow();
});
test.each([401, 403, 429, 503])('workflow %s never falls back around a failed authorization or service read', async statusCode => {
  request.mockRejectedValueOnce({ statusCode });
  await expect(getAIExplanation(scope, requestId)).rejects.toMatchObject({ statusCode });
  expect(request).toHaveBeenCalledTimes(1);
});
test.each([401, 403, 429, 503])('operation %s is preserved, never converted to a missing request', async statusCode => {
  request.mockRejectedValueOnce({ statusCode: 404 }).mockRejectedValueOnce({ statusCode });
  await expect(getAIExplanation(scope, requestId)).rejects.toMatchObject({ statusCode });
  expect(request).toHaveBeenCalledTimes(2);
});
test('two missing reads retain an uncertain request, while an older server preserves a known pending request', async () => {
  request.mockRejectedValueOnce({ statusCode: 404 }).mockRejectedValueOnce({ statusCode: 404 });
  await expect(getAIExplanation(scope, requestId)).rejects.toMatchObject({ statusCode: 404 });
  request.mockResolvedValueOnce({ request_id: requestId, status: 'accepted', version: 0 }).mockRejectedValueOnce({ statusCode: 404 });
  expect(await getAIExplanation(scope, requestId)).toMatchObject({ status: 'pending', workflow_version: 0 });
  expect(request.mock.calls.every(call => call[2].method === 'GET')).toBe(true);
});
test.each([
  { ...submitted, request_id: 'other' }, { ...submitted, operation_id: 'other' },
  { ...submitted, command_id: 'other' }, { ...submitted, operation_id: undefined },
  { ...submitted, command_id: undefined }, { ...submitted, status: 'published' },
])('invalid submission identity is rejected without retrying', async value => {
  request.mockResolvedValue(value);
  await expect(requestAIExplanation(scope, { requestId, reportId: '99' })).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
});
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
  { ...generated, requestId: 100 },
  { ...generated, content: { ...generated.content, schema_version: 'v2' } },
  { ...generated, content: { ...generated.content, limitations: undefined } },
  { ...generated, content: { ...generated.content, suggestions: [] } },
])('unsupported or incomplete responses do not render a success', value => {
  expect(() => validateExplanationView(value)).toThrow();
});
test('nullable empty source refs from Collection Go transport normalize only for low risk suggestions', () => {
  const content = { ...generated.content, suggestions: [{ ...generated.content.suggestions[0], source_suggestion_refs: null }] };
  expect(validateExplanationView({ ...generated, content }).content.suggestions[0].source_suggestion_refs).toEqual([]);
  expect(() => validateExplanationView({ ...generated, content: { ...content, suggestions: [{ ...content.suggestions[0], origin: 'standard_derived' }] } })).toThrow();
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
test('report readiness does not imply AI availability and does not hide a completed result', async () => {
  const unpublished = { ...source, ai_eligibility: { status: 'unavailable', reason_code: 'publication_missing' } };
  request.mockResolvedValueOnce(unpublished);
  await expect(getAIExplanationCapability(scope)).resolves.toMatchObject({
    status: 'not_applicable', reason_code: 'publication_missing', source_report_id: '99', source_state: 'current',
  });
  request.mockResolvedValueOnce(completed).mockResolvedValueOnce(unpublished);
  expect((await getAIExplanation(scope, requestId)).source_state).toBe('current');
});
test.each([
  { ...source, ai_eligibility: undefined },
  { ...source, ai_eligibility: { status: 'available', reason_code: 'publication_missing' } },
  { ...source, ai_eligibility: { status: 'unavailable', reason_code: 'unrecognized' } },
])('unverified AI availability never enables a new request', async value => {
  request.mockResolvedValue(value);
  await expect(getAIExplanationCapability(scope)).rejects.toThrow();
});
