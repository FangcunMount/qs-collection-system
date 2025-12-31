/**
 * 问卷题目相关工具函数
 */

/**
 * 过滤掉 Section 类型的题目
 * @param {Array} questions - 题目列表
 * @param {Function} [showControllerCheck] - 可选的显示控制检查函数，用于过滤不可见的题目
 * @returns {Array} 过滤后的题目列表
 */
export function filterNonSectionQuestions(questions, showControllerCheck = null) {
  if (!questions || !Array.isArray(questions)) {
    return [];
  }

  return questions.filter(q => {
    // 过滤掉 Section 类型
    if (q.type === 'Section') {
      return false;
    }

    // 如果提供了显示控制检查函数，则使用它
    if (showControllerCheck && typeof showControllerCheck === 'function') {
      return showControllerCheck(q.show_controller);
    }

    return true;
  });
}

/**
 * 获取有效题目数量（排除 Section 类型）
 * @param {Array} questions - 题目列表
 * @param {Function} [showControllerCheck] - 可选的显示控制检查函数
 * @returns {number} 有效题目数量
 */
export function getValidQuestionCount(questions, showControllerCheck = null) {
  return filterNonSectionQuestions(questions, showControllerCheck).length;
}

/**
 * 计算预计答题时间（分钟）
 * @param {Object} questionnaire - 问卷对象
 * @param {number} [questionnaire.estimated_time] - 问卷预设的预计时间（分钟）
 * @param {Array} [questionnaire.questions] - 题目列表
 * @param {Function} [showControllerCheck] - 可选的显示控制检查函数
 * @param {number} [timePerQuestion=0.5] - 每道题的预计时间（分钟），默认 0.5 分钟
 * @returns {number} 预计答题时间（分钟，向上取整）
 */
export function getEstimatedTime(questionnaire, showControllerCheck = null, timePerQuestion = 0.5) {
  // 如果问卷有预设的预计时间，优先使用
  if (questionnaire?.estimated_time && questionnaire.estimated_time > 0) {
    return Math.ceil(questionnaire.estimated_time);
  }

  // 否则根据有效题目数量计算
  const validQuestionCount = getValidQuestionCount(questionnaire?.questions, showControllerCheck);
  return Math.ceil(validQuestionCount * timePerQuestion);
}

