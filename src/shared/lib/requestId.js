/**
 * 生成提交幂等键，用于跨实例去重。
 * 同一笔提交重试时应复用同一个 key，429 退避重试时不要换新 key。
 */
export const createIdempotencyKey = (prefix = 'submit') => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
};

export default {
  createIdempotencyKey
};
