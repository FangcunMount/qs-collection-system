import { request } from '../servers';
import config from '../../config';

const buildQueryString = (params = {}) => {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return pairs.join('&');
};

const catalogRequest = (path, params = {}, { needToken = false } = {}) => {
  const queryString = buildQueryString(params);
  return request(queryString ? `${path}?${queryString}` : path, {}, {
    host: config.collectionHost,
    method: 'GET',
    needToken,
  });
};

// Collection reads immutable published models only. The page vocabulary may
// stay “量表”, while the transport contract is the generic model catalogue.
export const listPublishedAssessmentModels = ({
  kind = 'scale',
  category,
  page = 1,
  pageSize = 20,
} = {}) => catalogRequest('/assessment-models', {
  kind,
  category,
  page,
  page_size: pageSize,
});

export const listHotPublishedAssessmentModels = () => catalogRequest('/assessment-models/hot');

export const getPublishedAssessmentModel = (code) => catalogRequest(`/assessment-models/${code}`, {}, { needToken: true });

export const getAssessmentModelCatalogOptions = (kind = 'scale') => catalogRequest('/assessment-models/options', { kind });

export default {
  listPublishedAssessmentModels,
  listHotPublishedAssessmentModels,
  getPublishedAssessmentModel,
  getAssessmentModelCatalogOptions,
};
