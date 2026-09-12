import Taro from '@tarojs/taro';
import { request } from '@/services/servers';
import { beginAnswering, answeringOrigin } from '../answeringStart';
import { buildSubmissionFingerprint } from '../submissionAttempt';
jest.mock('@/services/servers', () => ({ request: jest.fn() }));
const contract = { questionnaire_code: 'Q', questionnaire_version: '1', testee_id: '12' };
beforeEach(() => { request.mockReset(); Taro.removeStorageSync('collection_pending_answering_start'); });
test('lost response reuses start key; new round uses a new key; no client store or clock', async () => {
  request.mockRejectedValueOnce(new Error('lost')).mockResolvedValue({ id: '123' });
  await expect(beginAnswering(contract, { type: 'self_service' })).rejects.toThrow('lost');
  const firstKey = request.mock.calls[0][1].request_key;
  const started = await beginAnswering(contract, { type: 'self_service' });
  expect(request.mock.calls[1][1].request_key).toBe(firstKey);
  expect(started.contract.answering_start_id).toBe('123');
  expect(Object.keys(request.mock.calls[1][1]).sort()).toEqual(['origin_ref','questionnaire_code','questionnaire_version','request_key','testee_id']);
  await beginAnswering(contract, { type: 'self_service' });
  expect(request.mock.calls[2][1].request_key).not.toBe(firstKey);
});
test('same page retry reuses its attempt and never accepts a malformed response', async () => {
  request.mockResolvedValueOnce({ id: '99' }).mockResolvedValueOnce({});
  const first = await beginAnswering(contract, { type: 'self_service' });
  await expect(beginAnswering(contract, { type: 'self_service' }, first.attempt)).rejects.toThrow('响应不完整');
  expect(request.mock.calls[1][1].request_key).toBe(first.attempt.requestKey);
});
test('source is frozen and changed start changes submission identity', () => {
  expect(answeringOrigin({}, 'task')).toEqual({ type: 'plan_task', id: 'task' });
  expect(answeringOrigin({ token: 't', raw: { raw: { entry: { id: '44' } } } })).toEqual({ type: 'assessment_entry', id: '44' });
  expect(() => answeringOrigin({ token: 't' })).toThrow('重新扫码');
  expect(buildSubmissionFingerprint({ ...contract, answering_start_id: '1' })).not.toBe(buildSubmissionFingerprint({ ...contract, answering_start_id: '2' }));
});
