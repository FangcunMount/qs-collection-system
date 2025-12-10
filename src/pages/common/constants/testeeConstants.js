/**
 * 受试者相关常量
 */

// 性别映射
export const GENDER_MAP = {
  1: "男",
  2: "女"
};

// 关系映射
export const RELATION_MAP = {
  parent: "父母",
  guardian: "监护人",
  self: "本人",
  teacher: "老师",
  other: "其他"
};

// 受试者状态
export const TESTEE_STATUS = {
  ACTIVE: { value: 1, label: "正常" },
  INACTIVE: { value: 0, label: "停用" }
};
