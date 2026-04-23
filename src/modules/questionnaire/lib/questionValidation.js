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
 * 获取题目的placeholder
 * @param {Object} question - 题目对象
 * @returns {string}
 */
export const getQuestionPlaceholder = (question) => {
  return question.placeholder || '请输入';
};

export default {
  getValidationRule,
  isQuestionRequired,
  getQuestionPlaceholder
};
