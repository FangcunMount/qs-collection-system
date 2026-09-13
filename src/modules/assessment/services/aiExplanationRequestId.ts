import Taro from '@tarojs/taro';

export async function createAIRequestId(): Promise<string> {
  const { randomValues } = await Taro.getRandomValues({ length: 16 });
  if (!(randomValues instanceof ArrayBuffer) || randomValues.byteLength !== 16) throw new Error('无法准备解读请求');
  const bytes = new Uint8Array(randomValues);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
