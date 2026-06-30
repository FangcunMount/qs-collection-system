import { request } from '../../servers';
import config from '../../../config';
import { normalizePersonalitySession } from './mappers';

/**
 * 创建人格测评会话（锁定题版 + 提交契约）
 */
export async function createPersonalitySession({ modelCode, testeeId }) {
  const result = await request('/personality-assessment-sessions', {
    model_code: modelCode,
    testee_id: testeeId,
  }, {
    host: config.collectionHost,
    method: 'POST',
    needToken: true,
  });

  return normalizePersonalitySession(result);
}
