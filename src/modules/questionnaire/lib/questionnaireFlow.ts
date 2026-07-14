import { isEmpty } from "@/shared/lib/type";

import type {
  AssessmentSubmitContract,
  QuestionnaireData,
  QuestionnaireQuestion,
  QuestionnaireSubmissionData,
  ShowController,
  ValidationRule,
} from "../types";

export const SUBMIT_NO_ANSWER_MESSAGE = "请至少完成一道题目后再提交";

export interface QuestionValidationResult {
  valid: boolean;
  message?: string;
}

export interface VisibleQuestionEntry {
  question: QuestionnaireQuestion;
  sourceIndex: number;
  displayIndex: number;
}

const getRuleValue = (
  rules: ValidationRule[] | undefined,
  ruleType: string,
): unknown => rules?.find((rule) => rule.rule_type === ruleType)?.target_value ?? null;

const isRequiredRule = (value: unknown): boolean => (
  value === 1 || value === "1" || value === "true" || value === true
);

const getQuestionDisplayIndex = (question: QuestionnaireQuestion, index?: number): string => {
  const titleIndex = String(question.title ?? "").split(".")[0].trim();
  return titleIndex || String((index ?? 0) + 1);
};

export function validateQuestion(
  question: QuestionnaireQuestion,
  index?: number,
): QuestionValidationResult {
  const rules = question.validation_rules;
  const required = getRuleValue(rules, "required");
  const minWords = getRuleValue(rules, "min_words");
  const maxWords = getRuleValue(rules, "max_words");
  const minValue = getRuleValue(rules, "min_value");
  const maxValue = getRuleValue(rules, "max_value");
  const minSelect = getRuleValue(rules, "min_select");
  const maxSelect = getRuleValue(rules, "max_select");
  const value = question.value;
  const empty = isEmpty(value);
  const displayIndex = getQuestionDisplayIndex(question, index);

  if (isRequiredRule(required) && empty) {
    return { valid: false, message: `第${displayIndex}题为必填题` };
  }
  if (empty) return { valid: true };

  const textValue = Array.isArray(value) ? value.join("") : String(value ?? "");
  const selectCount = Array.isArray(value) ? value.length : 1;

  if (minWords && textValue.length < Number(minWords)) {
    return { valid: false, message: `第${displayIndex}题最少字数为 ${minWords}，请检查答题内容` };
  }
  if (maxWords && textValue.length > Number(maxWords)) {
    return { valid: false, message: `第${displayIndex}题最大字数为 ${maxWords}，请检查答题内容` };
  }
  if (minValue && Number(value) < Number(minValue)) {
    return { valid: false, message: `第${displayIndex}题最小值为 ${minValue}` };
  }
  if (maxValue && Number(value) > Number(maxValue)) {
    return { valid: false, message: `第${displayIndex}题最大值为 ${maxValue}` };
  }
  if (minSelect && selectCount < Number(minSelect)) {
    return { valid: false, message: `第${displayIndex}题最少选择 ${minSelect} 个选项` };
  }
  if (maxSelect && selectCount > Number(maxSelect)) {
    return { valid: false, message: `第${displayIndex}题最多选择 ${maxSelect} 个选项` };
  }
  return { valid: true };
}

const isQuestionVisibleByCode = (
  questionsByCode: Map<string, QuestionnaireQuestion>,
  showController?: ShowController | "" | null,
  visiting = new Set<string>(),
): boolean => {
  if (!showController || !Array.isArray(showController.questions)) return true;

  const checks = showController.questions.map((condition) => {
    if (visiting.has(condition.code)) return false;
    const question = questionsByCode.get(condition.code);
    if (!question) return false;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(condition.code);
    if (!isQuestionVisibleByCode(questionsByCode, question.show_controller, nextVisiting)) return false;

    const selectedCodes = Array.isArray(question.value)
      ? question.value.map(String)
      : [String(question.value ?? "")];

    return condition.select_option_codes.some((expected) => (
      Array.isArray(expected)
        ? expected.every((code) => selectedCodes.includes(code))
        : selectedCodes.includes(expected)
    ));
  });

  if (showController.rule === "or") return checks.some(Boolean);
  if (showController.rule === "and") return checks.every(Boolean);
  return false;
}

export function isQuestionVisible(
  questions: QuestionnaireQuestion[],
  showController?: ShowController | "" | null,
  visiting = new Set<string>(),
): boolean {
  const questionsByCode = new Map(questions.map((question) => [question.code, question]));
  return isQuestionVisibleByCode(questionsByCode, showController, visiting);
}

export function getVisibleQuestionEntries(
  questions: QuestionnaireQuestion[],
): VisibleQuestionEntry[] {
  const questionsByCode = new Map(questions.map((question) => [question.code, question]));
  let displayIndex = 0;
  const entries: VisibleQuestionEntry[] = [];

  questions.forEach((question, sourceIndex) => {
    if (!isQuestionVisibleByCode(questionsByCode, question.show_controller)) return;

    entries.push({ question, sourceIndex, displayIndex });
    if (question.type !== "Section") displayIndex++;
  });

  return entries;
}

export function getVisibleQuestions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return getVisibleQuestionEntries(questions).map(({ question }) => question);
}

export function getVisibleAnswerQuestions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return getVisibleQuestions(questions).filter((question) => question.type !== "Section");
}

export function hasAnyVisibleAnswer(questions: QuestionnaireQuestion[]): boolean {
  return getVisibleAnswerQuestions(questions).some((question) => !isEmpty(question.value));
}

export function buildQuestionnaireSubmission(
  questionnaire: QuestionnaireData,
  submitContract?: AssessmentSubmitContract | null,
): QuestionnaireSubmissionData {
  return {
    name: questionnaire.name || questionnaire.title,
    title: questionnaire.title,
    code: submitContract?.questionnaire_code || questionnaire.code,
    version: submitContract?.questionnaire_version || questionnaire.version || "1.0",
    answers: getVisibleQuestions(questionnaire.questions),
  };
}

export interface QuestionnaireProgress {
  current: number;
  total: number;
  percentage: number;
}

export function getQuestionnaireProgress(
  questions: QuestionnaireQuestion[],
  currentQuestionCode: string,
): QuestionnaireProgress {
  const visible = getVisibleAnswerQuestions(questions);
  const index = visible.findIndex((question) => question.code === currentQuestionCode);
  const current = index >= 0 ? index + 1 : Math.min(visible.length + 1, visible.length);
  const total = visible.length;
  return {
    current,
    total,
    percentage: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0,
  };
}
