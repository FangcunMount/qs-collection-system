import { runInNewContext } from 'vm';
import Taro from '@tarojs/taro';
import { processApis } from '@tarojs/shared';
import { createAIRequestId } from '../aiExplanationRequestId';
import { isWorkflowRequestId } from '@/services/api/aiExplanationApi';

// Exercise Taro's installed native API adapter with WeChat's manager-only shape.
// There is intentionally no wx.getRandomValues or Taro.getRandomValues.
let manager;
beforeEach(() => {
  manager = { getRandomValues: jest.fn() };
  const wx = { getUserCryptoManager() { return manager; } };
  delete Taro.getRandomValues;
  processApis(Taro, wx, {
    isOnlyPromisify: true,
    modifyApis: apis => apis.add('getUserCryptoManager'),
  });
});

const validBytes = () => Uint8Array.from({ length: 16 }, (_, i) => i).buffer;

test('manager-only WeChat API produces a UUID with correct version and variant', async () => {
  manager.getRandomValues.mockImplementation(function (options) {
    expect(this).toBe(manager);
    options.success({ randomValues: validBytes() });
  });
  expect(Taro.getRandomValues).toBeUndefined();
  const id = await createAIRequestId();
  expect(id).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  expect(isWorkflowRequestId(id)).toBe(true);
  expect(manager.getRandomValues).toHaveBeenCalledWith(expect.objectContaining({
    length: 16, success: expect.any(Function), fail: expect.any(Function),
  }));
});

test.each([new ArrayBuffer(0), new ArrayBuffer(15), null])('invalid random data cannot create a request identity', async randomValues => {
  manager.getRandomValues.mockImplementation(options => options.success({ randomValues }));
  await expect(createAIRequestId()).rejects.toMatchObject({ code: 'AI_REQUEST_PREPARATION_FAILED' });
});

test('native callback returns void and must finish before UUID creation', async () => {
  let succeed;
  manager.getRandomValues.mockImplementation(options => { succeed = options.success; });
  let resolved = false;
  const result = createAIRequestId().then(id => { resolved = true; return id; });
  await Promise.resolve();
  expect(resolved).toBe(false);
  succeed({ randomValues: validBytes() });
  await expect(result).resolves.toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
});

test('native failure is a preparation failure, not an unknown submission', async () => {
  manager.getRandomValues.mockImplementation(options => { options.fail({ errMsg: 'not supported' }); });
  await expect(createAIRequestId()).rejects.toMatchObject({ code: 'AI_REQUEST_PREPARATION_FAILED' });
});

test('unavailable crypto manager fails without an insecure random fallback', async () => {
  delete Taro.getUserCryptoManager;
  await expect(createAIRequestId()).rejects.toMatchObject({ code: 'AI_REQUEST_PREPARATION_FAILED' });
});


test('WeChat cross-realm ArrayBuffer keeps all bytes and creates a UUID', async () => {
  const randomValues = runInNewContext('Uint8Array.from({length:16}, (_,i)=>i).buffer');
  expect(randomValues instanceof ArrayBuffer).toBe(false);
  manager.getRandomValues.mockImplementation(options => options.success({ randomValues }));
  await expect(createAIRequestId()).resolves.toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
});

test.each([
  { byteLength: 16 },
  { byteLength: 16, [Symbol.toStringTag]: 'ArrayBuffer' },
  new Uint8Array(16),
  runInNewContext('new ArrayBuffer(15)'),
])('buffer validation rejects lookalikes, typed arrays and incorrect lengths', async randomValues => {
  manager.getRandomValues.mockImplementation(options => options.success({ randomValues }));
  await expect(createAIRequestId()).rejects.toMatchObject({ code: 'AI_REQUEST_PREPARATION_FAILED' });
});
