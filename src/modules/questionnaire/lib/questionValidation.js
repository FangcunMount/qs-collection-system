/**
 * 问卷相关的工具函数
 */

/**
 * 从validation_rules数组中获取指定类型的规则值
 * @param {Array} rules - validation_rules数组
 * @param {string} ruleType - 规则类型
 * @returns {string|null} 规则的target_value
 */
export const getValidationRule = (rules, ruleType) => {
  if (!rules || !Array.isArray(rules)) return null;
  const rule = rules.find(r => r.rule_type === ruleType);
  return rule ? rule.target_value : null;
};

/**
 * 检查题目是否必填
 * @param {Object} question - 题目对象
 * @returns {boolean}
 */
export const isQuestionRequired = (question) => {
  const rules = question.validation_rules || [];
  const required = getValidationRule(rules, 'required');
  return required === "1" || required === "true" || required === true;
};

/**
 * 解析题目标题：title 为空时回退到 placeholder
 * @param {Object} question - 题目对象或包含 title/placeholder 的字段
 * @returns {string}
 */
export const resolveQuestionTitle = (question = {}) => {
  const title = String(question.title ?? '').trim();
  if (title) return title;
  return String(question.placeholder ?? '').trim();
};

/**
 * 解析题目提示文案
 * @param {Object} question - 题目对象或包含 tips 的字段
 * @returns {string}
 */
export const resolveQuestionTips = (question = {}) => {
  return String(question.tips ?? '').trim();
};

/**
 * 获取输入类题目的 placeholder
 * @param {Object} question - 题目对象
 * @returns {string}
 */
export const getQuestionPlaceholder = (question) => {
  const title = String(question?.title ?? '').trim();
  const placeholder = String(question?.placeholder ?? '').trim();
  if (title) {
    return placeholder || '请输入';
  }
  return '请输入';
};

export default {
  getValidationRule,
  isQuestionRequired,
  resolveQuestionTitle,
  resolveQuestionTips,
  getQuestionPlaceholder
};
