import Taro from '@tarojs/taro';
import { request } from '@/services/servers';
import config from '@/config';
import { createIdempotencyKey } from '@/shared/lib/requestId';

const STORAGE_KEY = 'collection_pending_answering_start';

export function answeringOrigin(entry = {}, taskId = '') {
  if (taskId) return { type: 'plan_task', id: String(taskId) };
  const entryId = entry?.raw?.raw?.entry?.id || entry?.raw?.entry?.id;
  if (entry?.token) {
    if (!entryId) throw new Error('测评入口信息不完整，请重新扫码');
    return { type: 'assessment_entry', id: String(entryId) };
  }
  return { type: 'self_service' };
}

/** The attempt belongs to one page's answering round, independently of submission. */
export async function beginAnswering(contract, origin, previous = null) {
  const payload = {
    testee_id: String(contract.testee_id || ''),
    questionnaire_code: String(contract.questionnaire_code || ''),
    questionnaire_version: String(contract.questionnaire_version || ''),
    origin_ref: origin,
  };
  if (!payload.testee_id || !payload.questionnaire_code || !payload.questionnaire_version) {
    throw new Error('作答内容或档案信息不完整，请刷新后重试');
  }
  // The server resolves the exact model binding from the published question version.
  const fingerprint = JSON.stringify(payload);
  const stored = Taro.getStorageSync(STORAGE_KEY);
  const candidate = previous?.fingerprint === fingerprint ? previous : stored;
  const attempt = candidate?.fingerprint === fingerprint
    ? candidate : { fingerprint, requestKey: createIdempotencyKey() };
  // Persist before sending, including when the response is lost or the app exits.
  Taro.setStorageSync(STORAGE_KEY, attempt);
  const result = await request('/answering-starts', { ...payload, request_key: attempt.requestKey }, {
    host: config.collectionHost, method: 'POST', needToken: true,
  });
  if (!/^[1-9]\d*$/.test(String(result?.id || ''))) throw new Error('作答开始记录响应不完整，请重试');
  // No cross-page answer drafts: an acknowledged start belongs to this round only.
  if (Taro.getStorageSync(STORAGE_KEY)?.requestKey === attempt.requestKey) Taro.removeStorageSync(STORAGE_KEY);
  return { attempt, contract: { ...contract, answering_start_id: String(result.id), origin_ref: origin } };
}
