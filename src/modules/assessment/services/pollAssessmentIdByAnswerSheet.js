const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const DEFAULT_ASSESSMENT_LOOKUP_INTERVAL_MS = 2000;
export const DEFAULT_ASSESSMENT_LOOKUP_MAX_ATTEMPTS = 30;

/**
 * 轮询测评列表，按 answer_sheet_id 匹配 assessment_id
 */
export async function pollAssessmentIdByAnswerSheet({
  testeeId,
  answerSheetId,
  fetchItems,
  intervalMs = DEFAULT_ASSESSMENT_LOOKUP_INTERVAL_MS,
  maxAttempts = DEFAULT_ASSESSMENT_LOOKUP_MAX_ATTEMPTS,
  onAttempt,
  timeoutMessage = '测评记录生成时间过长，请稍后查看报告',
  returnMatchedItem = false,
}) {
  const normalizedTesteeId = String(testeeId || '');
  const normalizedAnswerSheetId = String(answerSheetId || '');

  if (!normalizedTesteeId || !normalizedAnswerSheetId) {
    throw new Error('缺少 testee_id 或 answersheet_id，无法查询测评记录');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (typeof onAttempt === 'function') {
      onAttempt(attempt);
    }

    const items = await fetchItems(normalizedTesteeId);
    const hit = items.find(
      (item) => String(item.answer_sheet_id || '') === normalizedAnswerSheetId
    );

    if (hit?.id) {
      return returnMatchedItem ? hit : String(hit.id);
    }

    if (attempt < maxAttempts && intervalMs > 0) {
      await sleep(intervalMs);
    }
  }

  throw new Error(timeoutMessage);
}
