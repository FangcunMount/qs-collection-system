import {
  listPersonalityAssessments,
  extractPersonalityAssessmentList,
  normalizePersonalityAssessmentRecord,
  isPersonalityAssessmentDoneStatus,
} from '@/services/api/personality';

/**
 * 从 GET /typology-assessments 加载人格测评记录并映射为记录卡片格式
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
  });

  const data = result?.items || result?.assessments ? result : (result.data || result);
  const filteredItems = extractPersonalityAssessmentList(data)
    .map(normalizePersonalityAssessmentRecord)
    .filter((record) => {
      if (statusFilter !== 'done') return true;
      return isPersonalityAssessmentDoneStatus(record.status);
    });

  const total = filteredItems.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  const items = filteredItems.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
  };
}
