/**
 * 答案 value 序列化：统一输出 JSON 字符串，符合 collection-server Answer.Value 契约
 */

export const USE_JSON_ANSWER_VALUE = true;

export function serializeAnswerValue(question) {
  const type = question.type;
  const value = question.value;

  if (!USE_JSON_ANSWER_VALUE) {
    switch (type) {
      case 'CheckBox':
      case 'ImageCheckBox':
        return JSON.stringify(value || []);
      default:
        return String(value ?? '');
    }
  }

  switch (type) {
    case 'Radio':
    case 'ScoreRadio':
    case 'ImageRadio':
    case 'Select':
      return JSON.stringify({ option: value || '' });
    case 'CheckBox':
    case 'ImageCheckBox':
      return JSON.stringify({ options: value || [] });
    case 'Number':
      return JSON.stringify({ value: Number(value) });
    case 'Text':
    case 'Textarea':
    case 'Date':
    default:
      return JSON.stringify({ value: value ?? '' });
  }
}
