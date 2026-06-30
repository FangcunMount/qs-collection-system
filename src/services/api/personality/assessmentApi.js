import { request } from '../../servers';
import config from '../../../config';
import { unwrapResponse, toStringId } from './mappers';

const buildQueryString = (params = {}) => {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return pairs.join('&');
};

/**
 * 获取人格测评记录列表
 */
export async function listPersonalityAssessments({
  testeeId,
  modelCode,
  status,
  page = 1,
  pageSize = 20,
} = {}) {
  const params = {
    testee_id: testeeId ? toStringId(testeeId) : '',
    model_code: modelCode,
    status,
    page,
    page_size: pageSize,
  };
  const queryString = buildQueryString(params);
  const url = queryString ? `/personality-assessments?${queryString}` : '/personality-assessments';

  const result = await request(url, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken: true,
  });

  return unwrapResponse(result) || {};
}

/**
 * 获取人格测评详情
 */
export async function getPersonalityAssessmentDetail(assessmentId, testeeId) {
  const result = await request(`/personality-assessments/${toStringId(assessmentId)}`, {}, {
    host: config.collectionHost,
    params: { testee_id: toStringId(testeeId) },
    needToken: true,
  });
  return unwrapResponse(result) || {};
}
