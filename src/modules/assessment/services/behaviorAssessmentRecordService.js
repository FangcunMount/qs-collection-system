import {
  extractBehaviorAssessmentList,
  listBehaviorAssessments,
  normalizeBehaviorAssessmentRecord,
} from '@/services/api/behavior';

/**
 * 从行为能力专用 GET /behavior-assessments 加载记录。
 */
export async function loadBehaviorAssessmentRecords({
  testeeId,
  statusFilter = '',
  page = 1,
  pageSize = 20,
} = {}) {
  if (!testeeId) {
    return { items: [], page: 1, pageSize, total: 0, totalPages: 0 };
  }

  const result = await listBehaviorAssessments({
    testeeId,
    status: statusFilter,
    page,
    pageSize,
  });
  const items = extractBehaviorAssessmentList(result).map(normalizeBehaviorAssessmentRecord);
  const total = Number(result?.total ?? items.length);
  const resolvedPageSize = Number(result?.page_size ?? result?.pageSize ?? pageSize);

  return {
    items,
    page: Number(result?.page ?? page),
    pageSize: resolvedPageSize,
    total,
    totalPages: Number(
      result?.total_pages
        ?? result?.totalPages
        ?? (resolvedPageSize > 0 ? Math.ceil(total / resolvedPageSize) : 0)
    ),
  };
}
