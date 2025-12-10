/**
 * 问卷量表相关常量
 */

// 量表分类
export const QUESTIONSHEET_CATEGORIES = [
  { value: "all", label: "全部" },
  { value: "psychology", label: "心理评估" },
  { value: "cognition", label: "认知评估" },
  { value: "development", label: "发育评估" },
  { value: "behavior", label: "行为评估" }
];

// 题型映射
export const QUESTION_TYPE_MAP = {
  Section: "分节",
  Radio: "单选题",
  Checkbox: "多选题",
  Text: "单行文本",
  Textarea: "多行文本",
  Number: "数字输入",
  Date: "日期选择",
  ScoreRadio: "评分题",
  Select: "下拉选择",
  ImageRadio: "图片单选",
  ImageCheckBox: "图片多选"
};

// 问卷状态
export const QUESTIONSHEET_STATUS = {
  DRAFT: { value: 0, label: "草稿" },
  PUBLISHED: { value: 1, label: "已发布" },
  CLOSED: { value: 2, label: "已结束" }
};
