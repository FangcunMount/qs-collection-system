/**
 * 生成提交幂等键，用于跨实例去重。
 * 同一笔提交重试时应复用同一个 key，429 退避重试时不要换新 key。
 */
const createUuidV4 = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
};

export const createIdempotencyKey = (prefix = 'submit') => {
  return `${prefix}-${createUuidV4()}`;
};

export const createRequestId = () => {
  return createUuidV4();
};

export default {
  createIdempotencyKey,
  createRequestId,
};
