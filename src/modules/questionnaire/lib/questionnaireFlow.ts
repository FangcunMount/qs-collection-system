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

const isAnswerEmpty = (value: unknown): boolean => (
  typeof value === "string" ? value.trim().length === 0 : isEmpty(value)
);

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
  const minLength = getRuleValue(rules, "min_length");
  const maxLength = getRuleValue(rules, "max_length");
  const minValue = getRuleValue(rules, "min_value");
  const maxValue = getRuleValue(rules, "max_value");
  const minSelections = getRuleValue(rules, "min_selections");
  const maxSelections = getRuleValue(rules, "max_selections");
  const value = question.value;
  const empty = isAnswerEmpty(value);
  const displayIndex = getQuestionDisplayIndex(question, index);

  if (isRequiredRule(required) && empty) {
    return { valid: false, message: `第${displayIndex}题为必填题` };
  }
  if (empty) return { valid: true };

  const textValue = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  // Match the submission validator's utf8.RuneCountInString, including emoji.
  const textLength = Array.from(textValue).length;
  const selectCount = Array.isArray(value) ? value.length : typeof value === "string" ? 1 : 0;

  if (minLength != null && textLength < Number(minLength)) {
    return { valid: false, message: `第${displayIndex}题最少字数为 ${minLength}，请检查答题内容` };
  }
  if (maxLength != null && textLength > Number(maxLength)) {
    return { valid: false, message: `第${displayIndex}题最大字数为 ${maxLength}，请检查答题内容` };
  }
  if (minValue != null && Number(value) < Number(minValue)) {
    return { valid: false, message: `第${displayIndex}题最小值为 ${minValue}` };
  }
  if (maxValue != null && Number(value) > Number(maxValue)) {
    return { valid: false, message: `第${displayIndex}题最大值为 ${maxValue}` };
  }
  if (minSelections != null && selectCount < Number(minSelections)) {
    return { valid: false, message: `第${displayIndex}题最少选择 ${minSelections} 个选项` };
  }
  if (maxSelections != null && selectCount > Number(maxSelections)) {
    return { valid: false, message: `第${displayIndex}题最多选择 ${maxSelections} 个选项` };
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

const SINGLE_CHOICE_AUTO_ADVANCE_TYPES = new Set([
  "Radio",
  "ImageRadio",
  "ScoreRadio",
  "Select",
]);

export function shouldAutoAdvanceOnSelect(
  question: QuestionnaireQuestion,
  value: unknown,
): boolean {
  if (!SINGLE_CHOICE_AUTO_ADVANCE_TYPES.has(question.type)) return false;
  if (value == null || value === "") return false;

  const selectedOption = question.options?.find((option) => option.code === value);
  if (selectedOption?.allow_extend_text === "1") return false;

  return true;
}

export function getAdjacentVisibleStep(
  questions: QuestionnaireQuestion[],
  currentIndex: number,
  direction: "next" | "prev" = "next",
): number {
  let stepNum = 1;

  while (true) {
    const targetIndex = direction === "next"
      ? currentIndex + stepNum
      : currentIndex - stepNum;
    const targetQuestion = questions[targetIndex];
    if (!targetQuestion) break;
    if (isQuestionVisible(questions, targetQuestion.show_controller)) break;
    stepNum++;
  }

  return stepNum;
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

// Optional questions with no value are represented by an omitted answer entry,
// not an empty option/text payload. This is the submission contract expected by
// collection-server and the final questionnaire validator.
export function getVisibleAnsweredQuestions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return getVisibleAnswerQuestions(questions).filter((question) => !isAnswerEmpty(question.value));
}

export function hasAnyVisibleAnswer(questions: QuestionnaireQuestion[]): boolean {
  return getVisibleAnsweredQuestions(questions).length > 0;
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
    answers: getVisibleAnsweredQuestions(questionnaire.questions),
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
