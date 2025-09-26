import { request } from '../servers'

export const getAnalysis = (id) => {
  return request('/readAnswerSheet/interpretationReport', {answersheetid: id}, { isNeedLoading: true })
}

export default {
  getAnalysis
}