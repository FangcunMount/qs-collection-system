import { getAssessments, extractAssessmentList } from '@/services/api/assessments';
import { COLLECTION_API_CAPABILITIES, isAssessmentsListUnavailableError } from '@/shared/config/collectionApiCapabilities';

const emptyMedicalListResult = (pageSize = 20) => ({
  items: [],
  page: 1,
  pageSize,
  total: 0,
  totalPages: 0,
  unavailable: true,
});

/**
 * 加载医学量表测评记录。
 * 通过 collection.yaml 定义的 GET /assessments 加载医学量表测评列表。
 */
export async function loadMedicalAssessmentRecords(params = {}) {
  const {
    testeeId,
    status,
    scaleCode,
    riskLevel,
    dateFrom,
    dateTo,
    assessmentKind,
    page = 1,
    pageSize = 20,
  } = params;

  if (!testeeId) {
    return emptyMedicalListResult(pageSize);
  }

  if (!COLLECTION_API_CAPABILITIES.medicalAssessmentsList) {
    return emptyMedicalListResult(pageSize);
  }

  try {
    const result = await getAssessments({
      testeeId,
      status,
      scaleCode,
      riskLevel,
      dateFrom,
      dateTo,
      assessmentKind,
      page,
      pageSize,
    });
    const data = result?.data !== undefined ? result.data : result;
    const items = extractAssessmentList(data);
    const total = Number(data?.total || items.length || 0);
    const pageSizeValue = Number(data?.page_size || data?.pageSize || pageSize);
    const totalPages = Number(
      data?.total_pages || data?.totalPages || (pageSizeValue > 0 ? Math.ceil(total / pageSizeValue) : 0)
    );

    return {
      items,
      page: Number(data?.page || page),
      pageSize: pageSizeValue,
      total,
      totalPages,
      unavailable: false,
    };
  } catch (error) {
    if (isAssessmentsListUnavailableError(error)) {
      console.warn('[loadMedicalAssessmentRecords] GET /assessments 未在 collection-server 提供，返回空列表');
      return emptyMedicalListResult(pageSize);
    }
    throw error;
  }
}
