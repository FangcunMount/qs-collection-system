/**
 * collection-server 能力开关（以 docs/collection.yaml 为准）。
 * 未列入 yaml 的接口在前端禁止发起请求，避免无意义 404。
 */
export const COLLECTION_API_CAPABILITIES = Object.freeze({
  /** GET /assessments 列表 */
  medicalAssessmentsList: false,
});

export function createAssessmentsListUnavailableError(message) {
  const error = new Error(
    message || 'GET /assessments 未在 collection-server 提供'
  );
  error.code = '404';
  return error;
}

export function isAssessmentsListUnavailableError(error) {
  const code = String(error?.code ?? error?.statusCode ?? error?.data?.code ?? '');
  const text = String(error?.message ?? error?.data?.message ?? '').toLowerCase();
  return code === '404' || text.includes('not found') || text.includes('404');
}
