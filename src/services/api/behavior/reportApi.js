import { request } from '../../servers';
import config from '../../../config';
import {
  mapBehaviorReportPayload,
  normalizeBehaviorReportStatus,
  toStringId,
} from './mappers';

export async function getBehaviorReportStatus({ assessmentId, testeeId }) {
  const result = await request(
    `/behavior-assessments/${toStringId(assessmentId)}/report-status`,
    {},
    {
      host: config.collectionHost,
      method: 'GET',
      params: { testee_id: toStringId(testeeId) },
      needToken: true,
    }
  );
  return normalizeBehaviorReportStatus(result);
}

export async function waitBehaviorReport({ assessmentId, testeeId, timeout = 20 }) {
  const validTimeout = Math.max(1, Math.min(25, timeout));
  const result = await request(
    `/behavior-assessments/${toStringId(assessmentId)}/wait-report`,
    {},
    {
      host: config.collectionHost,
      method: 'GET',
      params: {
        testee_id: toStringId(testeeId),
        timeout: validTimeout,
      },
      needToken: true,
    }
  );
  return normalizeBehaviorReportStatus(result);
}

export async function getBehaviorReport({ assessmentId, testeeId }) {
  const result = await request(
    `/behavior-assessments/${toStringId(assessmentId)}/report`,
    {},
    {
      host: config.collectionHost,
      method: 'GET',
      params: { testee_id: toStringId(testeeId) },
      needToken: true,
    }
  );
  return mapBehaviorReportPayload(result);
}
