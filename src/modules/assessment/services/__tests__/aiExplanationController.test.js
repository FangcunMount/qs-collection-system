import { createAIExplanationController } from '../aiExplanationController';
import { ready, pending, generated, failed } from '../../../../../scripts/test/fixtures/aiExplanation';
const scope = { accountId: 'account-1', assessmentId: '101', testeeId: '201' };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
let deps;
let controller;
beforeEach(() => {
  jest.useFakeTimers();
  deps = { capability: jest.fn().mockResolvedValue(ready), request: jest.fn().mockResolvedValue(pending), get: jest.fn().mockResolvedValue(generated),
    read: jest.fn(), save: jest.fn(), remove: jest.fn(), readRetryAt: jest.fn().mockReturnValue(0), saveRetryAt: jest.fn(), random: () => .5, createRequestId: jest.fn().mockResolvedValue('00000000-0000-4000-8000-000000000001') };
});
afterEach(() => { controller?.hide(); jest.useRealTimers(); });
const setup = (options = {}) => { const changed = jest.fn(); controller = createAIExplanationController(scope, changed, options, deps); controller.show(); return changed; };

test('mount/show/refresh are GET-only, double start is single-flight, 202 waits then generated stops', async () => {
  setup(); await flush(); expect(controller.getState().view).toBe('ready');
  controller.refresh(); await flush(); expect(deps.request).not.toHaveBeenCalled();
  const first = controller.start(); const second = controller.start(); await Promise.all([first, second]);
  expect(deps.request).toHaveBeenCalledTimes(1); expect(controller.getState().view).toBe('waiting');
  expect(deps.save).toHaveBeenCalledWith(scope, '00000000-0000-4000-8000-000000000001', '99');
  jest.advanceTimersByTime(2000); await flush();
  expect(controller.getState()).toMatchObject({ view: 'generated', animateCompletion: true });
  expect(jest.getTimerCount()).toBe(0);
});
test('direct generated POST skips polling and no completion animation on later refresh', async () => {
  deps.request.mockResolvedValue(generated); setup(); await flush(); await controller.start();
  expect(controller.getState()).toMatchObject({ view: 'generated', animateCompletion: false });
  expect(deps.get).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  controller.refresh(); await flush(); expect(controller.getState().animateCompletion).toBe(false);
});
test('failed retryable=true refreshes existing gid, never starts a new attempt', async () => {
  deps.request.mockResolvedValue(failed); deps.get.mockResolvedValue(failed);
  setup(); await flush(); await controller.start(); controller.refresh(); await flush(); await controller.start();
  expect(deps.request).toHaveBeenCalledTimes(1); expect(deps.get).toHaveBeenCalledWith(scope, '00000000-0000-4000-8000-000000000001', expect.anything());
  expect(controller.getState().view).toBe('failed');
});
test('unknown POST and 404 retain the durable command; only explicit retry replays it', async () => {
  deps.request.mockRejectedValue({ code: '-1' }); deps.get.mockRejectedValue({statusCode:404});
  setup(); await flush(); await controller.start();
  expect(controller.getState().view).toBe('unconfirmed'); controller.hide(); controller.show(); await flush();
  expect(controller.getState().view).toBe('unconfirmed'); expect(deps.request).toHaveBeenCalledTimes(1);
  expect(deps.remove).not.toHaveBeenCalled();
  deps.request.mockResolvedValue(pending);
  await controller.prepare();
  expect(controller.getState().view).toBe('waiting'); expect(deps.request).toHaveBeenCalledTimes(2);
  expect(deps.request.mock.calls[0][1]).toEqual(deps.request.mock.calls[1][1]);
  expect(deps.createRequestId).toHaveBeenCalledTimes(1);
});
test('429 schedules nothing and prevents early manual refresh across hide/show', async () => {
  deps.request.mockRejectedValue({ statusCode: 429, retryAfterMs: 86400000 }); setup(); await flush(); await controller.start();
  const calls = deps.capability.mock.calls.length;
  controller.refresh(); controller.hide(); controller.show(); await flush();
  expect(controller.getState().view).toBe('limited'); expect(deps.capability).toHaveBeenCalledTimes(calls); expect(jest.getTimerCount()).toBe(0);
  jest.advanceTimersByTime(86400000); controller.refresh(); await flush(); expect(deps.capability).toHaveBeenCalledTimes(calls); expect(deps.get).toHaveBeenCalledTimes(1);
});
test('hiding cancels work and ignores late output; show resumes known gid using GET', async () => {
  let resolveGet; deps.get.mockImplementation(() => new Promise(resolve => { resolveGet = resolve; }));
  setup({ requestId: '00000000-0000-4000-8000-000000000001' }); await flush();
  const lifetime = deps.get.mock.calls[0][2]; controller.hide(); expect(lifetime.isActive()).toBe(false);
  resolveGet(generated); await flush(); expect(controller.getState().output).toBeUndefined(); expect(deps.save).not.toHaveBeenCalled();
  controller.show(); await flush(); expect(deps.get).toHaveBeenCalledTimes(2); expect(deps.request).not.toHaveBeenCalled();
});
test('aborted POST is stored before sending and a remounted page only queries the original UUID', async () => {
  let finish; deps.request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  setup(); await flush(); const post = controller.start(); await flush();
  const saved={requestId:pending.requestId,sourceReportId:pending.source_report_id};
  expect(deps.save).toHaveBeenCalledTimes(1); deps.read.mockReturnValue(saved);
  controller.hide(); finish(generated); await post;
  expect(deps.save).toHaveBeenCalledTimes(1);
  setup(); await flush(); expect(controller.getState().view).toBe('generated');
  expect(deps.request).toHaveBeenCalledTimes(1);
  expect(deps.get).toHaveBeenCalledWith(scope,saved.requestId,expect.anything());
});
test('account context invalidation refuses late responses even without a hide callback', async () => {
  let current = true, finish; deps.get.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  setup({ requestId: '00000000-0000-4000-8000-000000000001', isCurrent: () => current }); current = false; finish(generated); await flush();
  expect(controller.getState().output).toBeUndefined(); expect(deps.save).not.toHaveBeenCalled();
});
test('a missing workflow from a link never falls back to creating another request', async () => {
  deps.get.mockRejectedValue({ statusCode: 404 }); setup({ requestId: pending.requestId }); await flush();
  expect(deps.remove).not.toHaveBeenCalled(); expect(deps.capability).not.toHaveBeenCalled();
  expect(controller.getState().view).toBe('unconfirmed'); await controller.prepare(); await flush();
  expect(deps.request).not.toHaveBeenCalled(); expect(deps.get).toHaveBeenCalledTimes(2);
});
test('permission denial clears output and terminates polling', async () => {
  deps.get.mockRejectedValue({ statusCode: 403 }); setup({ requestId: '00000000-0000-4000-8000-000000000001' }); await flush();
  expect(controller.getState()).toMatchObject({ view: 'forbidden', requestId: undefined }); expect(jest.getTimerCount()).toBe(0);
});
test.each(['current','stale','unavailable','unknown'])('generated source %s is preserved independently', async source_state => {
  deps.get.mockResolvedValue({ ...generated, source_state }); setup({ requestId: '00000000-0000-4000-8000-000000000001' }); await flush();
  expect(controller.getState()).toMatchObject({ view: 'generated', output: { source_state } }); expect(jest.getTimerCount()).toBe(0);
});
test('five minute foreground limit cancels an in-flight GET and pauses without declaring failure', async () => {
  deps.get.mockImplementation(() => new Promise(() => {})); setup(); await flush(); await controller.start();
  jest.advanceTimersByTime(2000); await flush(); jest.advanceTimersByTime(298000); await flush();
  expect(controller.getState().view).toBe('paused'); expect(deps.get.mock.calls[0][2].isActive()).toBe(false); expect(jest.getTimerCount()).toBe(0);
});
test('network retries are bounded; entry card does not poll', async () => {
  deps.get.mockRejectedValue({ statusCode: 503 }); setup({ requestId: '00000000-0000-4000-8000-000000000001' }); await flush();
  for (let i = 0; i < 3; i++) { jest.advanceTimersByTime(10000); await flush(); }
  expect(deps.get).toHaveBeenCalledTimes(4); expect(controller.getState().view).toBe('paused'); expect(jest.getTimerCount()).toBe(0);
  controller.hide(); setup({ requestId: '00000000-0000-4000-8000-000000000001', poll: false }); await flush(); expect(jest.getTimerCount()).toBe(0);
});
test('no overlapping GET while previous response is pending', async () => {
  deps.get.mockImplementation(() => new Promise(() => {})); setup(); await flush(); await controller.start();
  jest.advanceTimersByTime(10000); await flush(); jest.advanceTimersByTime(10000); await flush();
  expect(deps.get).toHaveBeenCalledTimes(1);
});

test('a remounted page respects a persisted Retry-After before capability or POST', async () => {
  deps.readRetryAt.mockReturnValue(Date.now() + 86400000); setup(); await flush();
  expect(controller.getState().view).toBe('limited'); expect(deps.capability).not.toHaveBeenCalled();
  await controller.start(); expect(deps.request).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
});

test('storage failure prevents POST, including explicit recovery',async()=>{
 deps.save.mockImplementation(()=>{throw {code:'AI_STORAGE_UNAVAILABLE'}});
 setup(); await flush(); await controller.start();
 expect(controller.getState().view).toBe('storageUnavailable');expect(deps.request).not.toHaveBeenCalled();
});
test('storage read failure does not turn into a fresh request',async()=>{
 deps.read.mockImplementation(()=>{throw {code:'AI_STORAGE_UNAVAILABLE'}});
 setup();await flush();await controller.start();
 expect(controller.getState().view).toBe('storageUnavailable');expect(deps.capability).not.toHaveBeenCalled();expect(deps.request).not.toHaveBeenCalled();
});
test('another page saving a command during UUID creation prevents a second submission',async()=>{
 let finish;deps.createRequestId.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));
 setup();await flush();const post=controller.start();await flush();
 deps.read.mockReturnValue({requestId:pending.requestId,sourceReportId:'99'});
 finish('00000000-0000-4000-8000-000000000002');await post;
 expect(deps.request).not.toHaveBeenCalled();expect(deps.get).toHaveBeenCalledWith(scope,pending.requestId,expect.anything());
});
test('source identity mismatch in completed results cannot be displayed',async()=>{
 deps.get.mockResolvedValue({...generated,source_report_id:'100'});
 setup();await flush();await controller.start();controller.refresh();await flush();
 expect(controller.getState().view).toBe('unsupported');expect(controller.getState().output).toBeUndefined();
});
test('request ID preparation failure never claims an uncertain POST or writes a pointer', async () => {
 deps.createRequestId.mockRejectedValueOnce({code:'AI_REQUEST_PREPARATION_FAILED'});
 setup(); await flush(); await controller.start();
 expect(controller.getState().view).toBe('preparationFailed');
 expect(deps.request).not.toHaveBeenCalled(); expect(deps.save).not.toHaveBeenCalled();
 controller.refresh(); await flush(); await controller.start();
 expect(deps.request).toHaveBeenCalledTimes(1);
 expect(controller.getState().view).toBe('waiting');
});
