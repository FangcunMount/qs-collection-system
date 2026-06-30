/**
 * @deprecated 请使用 @/services/api/personality 适配层
 * 保留此文件以兼容旧 import 路径
 */
import {
  listPublishedPersonalityModels,
  listPersonalityModelCategories,
  createPersonalitySession,
  listPersonalityAssessments,
  getPersonalityAssessmentDetail as fetchPersonalityAssessmentDetail,
  waitPersonalityReport,
  getPersonalityReport,
} from './personality';

export const createPersonalityAssessmentSession = ({ modelCode, testeeId }) => {
  return createPersonalitySession({ modelCode, testeeId });
};

export const getPersonalityModels = (params) => {
  return listPublishedPersonalityModels(params).then((result) => result.raw);
};

export const getPersonalityModelCategories = () => {
  return listPersonalityModelCategories();
};

export const getPersonalityAssessments = (params) => {
  return listPersonalityAssessments(params);
};

export const getPersonalityAssessmentDetail = (id, testeeId) => {
  return fetchPersonalityAssessmentDetail(id, testeeId);
};

export const waitPersonalityAssessmentReport = (id, testeeId, timeout = 20) => {
  return waitPersonalityReport({ assessmentId: id, testeeId, timeout });
};

export const getPersonalityAssessmentReport = (id, testeeId) => {
  return getPersonalityReport({ assessmentId: id, testeeId });
};

export default {
  createPersonalityAssessmentSession,
  getPersonalityModels,
  getPersonalityModelCategories,
  getPersonalityAssessments,
  getPersonalityAssessmentDetail,
  waitPersonalityAssessmentReport,
  getPersonalityAssessmentReport,
};
