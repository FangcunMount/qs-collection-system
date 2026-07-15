import { request } from '../../servers';
import config from '../../../config';
import { toStringId, unwrapResponse } from './mappers';

const buildQueryString = (params = {}) => Object.entries(params)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('&');

export async function listBehaviorAssessments({
  testeeId,
  status,
  page = 1,
  pageSize = 20,
} = {}) {
  const query = buildQueryString({
    testee_id: toStringId(testeeId),
    status,
    page,
    page_size: pageSize,
  });
  const result = await request(`/behavior-assessments${query ? `?${query}` : ''}`, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
  });
  return unwrapResponse(result) || {};
}

export async function getBehaviorAssessmentDetail({ assessmentId, testeeId }) {
  const result = await request(`/behavior-assessments/${toStringId(assessmentId)}`, {}, {
    host: config.collectionHost,
    method: 'GET',
    params: { testee_id: toStringId(testeeId) },
    needToken: true,
  });
  return unwrapResponse(result) || {};
}
