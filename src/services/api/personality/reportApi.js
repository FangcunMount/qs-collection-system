import { request } from '../../servers';
import config from '../../../config';
import { unwrapResponse, toStringId, normalizeReportStatus } from './mappers';

/**
 * 长轮询等待人格测评报告
 */
export async function waitPersonalityReport({ assessmentId, testeeId, timeout = 20 }) {
  const validTimeout = Math.max(1, Math.min(25, timeout));

  const result = await request(
    `/personality-assessments/${toStringId(assessmentId)}/wait-report`,
    {},
    {
      host: config.collectionHost,
      method: 'GET',
      needToken: true,
      params: {
        testee_id: toStringId(testeeId),
        timeout: validTimeout,
      },
    }
  );

  return normalizeReportStatus(result);
}

/**
 * 短轮询获取人格测评报告状态
 */
export async function getPersonalityReportStatus({ assessmentId, testeeId }) {
  const result = await request(
    `/personality-assessments/${toStringId(assessmentId)}/report-status`,
    {},
    {
      host: config.collectionHost,
      method: 'GET',
      needToken: true,
      params: {
        testee_id: toStringId(testeeId),
      },
    }
  );

  return normalizeReportStatus(result);
}

/**
 * 获取人格测评报告
 */
export async function getPersonalityReport({ assessmentId, testeeId }) {
  const result = await request(
    `/personality-assessments/${toStringId(assessmentId)}/report`,
    {},
    {
      host: config.collectionHost,
      params: { testee_id: toStringId(testeeId) },
      needToken: true,
    }
  );

  return unwrapResponse(result) || {};
}
