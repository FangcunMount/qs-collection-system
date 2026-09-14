import Taro from '@tarojs/taro';

export class AIRequestPreparationError extends Error {
  readonly code = 'AI_REQUEST_PREPARATION_FAILED';
  constructor() { super('无法准备解读请求'); }
}

export async function createAIRequestId(): Promise<string> {
  try {
    // Taro 3.6 forwards this native API without promisifying it. Wait for its
    // callbacks, while also consuming a Promise returned by newer adapters.
    const { randomValues } = await new Promise<Taro.UserCryptoManager.getRandomValues.SuccessCallbackResult>((resolve, reject) => {
      const result = Taro.getRandomValues({ length: 16, success: resolve, fail: reject });
      result?.then(resolve, reject);
    });
    if (!(randomValues instanceof ArrayBuffer) || randomValues.byteLength !== 16) throw new AIRequestPreparationError();
    const bytes = new Uint8Array(randomValues);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  } catch (_) {
    throw new AIRequestPreparationError();
  }
}
