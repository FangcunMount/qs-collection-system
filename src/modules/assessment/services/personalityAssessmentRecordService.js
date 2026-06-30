import {
  listPersonalityAssessments,
  extractPersonalityAssessmentList,
  normalizePersonalityAssessmentRecord,
  isPersonalityAssessmentDoneStatus,
} from '@/services/api/personality';

/**
 * 从 GET /personality-assessments 加载人格测评记录并映射为记录卡片格式
 */
export async function loadPersonalityAssessmentRecords({
  testeeId,
  statusFilter = '',
  page = 1,
  pageSize = 20,
} = {}) {
  if (!testeeId) {
    return {
      items: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
    };
  }

  const result = await listPersonalityAssessments({
    testeeId,
    status: statusFilter && statusFilter !== 'done' ? statusFilter : undefined,
    page,
    pageSize,
  });

  const data = result?.items || result?.assessments ? result : (result.data || result);
  const items = extractPersonalityAssessmentList(data)
    .map(normalizePersonalityAssessmentRecord)
    .filter((record) => {
      if (statusFilter !== 'done') return true;
      return isPersonalityAssessmentDoneStatus(record.status);
    });

  return {
    items,
    page: Number(data.page || page),
    pageSize: Number(data.page_size || data.pageSize || pageSize),
    total: Number(data.total || 0),
    totalPages: Number(data.total_pages || data.totalPages || 0),
  };
}
