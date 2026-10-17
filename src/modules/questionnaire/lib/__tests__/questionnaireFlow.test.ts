import {
  buildQuestionnaireSubmission,
  getAdjacentVisibleStep,
  getQuestionnaireProgress,
  getVisibleQuestionEntries,
  getVisibleAnswerQuestions,
  hasAnyVisibleAnswer,
  isQuestionVisible,
  shouldAutoAdvanceOnSelect,
  SUBMIT_NO_ANSWER_MESSAGE,
  validateQuestion,
} from "../questionnaireFlow";

import type { QuestionnaireQuestion } from "../../types";

describe("questionnaire flow", () => {
  const questions: QuestionnaireQuestion[] = [
    { code: "q1", type: "Radio", title: "1. 是否", value: "yes" },
    {
      code: "q2",
      type: "Text",
      title: "2. 说明",
      value: "",
      show_controller: {
        rule: "and",
        questions: [{ code: "q1", select_option_codes: ["yes"] }],
      },
    },
    {
      code: "q3",
      type: "Text",
      title: "3. 隐藏题",
      value: "不应提交",
      show_controller: {
        rule: "or",
        questions: [{ code: "q1", select_option_codes: ["no"] }],
      },
    },
  ];

  test("keeps conditional visibility and omits hidden or unanswered optional answers", () => {
    expect(isQuestionVisible(questions, questions[1].show_controller)).toBe(true);
    expect(isQuestionVisible(questions, questions[2].show_controller)).toBe(false);
    expect(getVisibleAnswerQuestions(questions).map((item) => item.code)).toEqual(["q1", "q2"]);
    expect(buildQuestionnaireSubmission({ code: "scale", questions }, null)).toEqual(
      expect.objectContaining({
        code: "scale",
        version: "1.0",
        answers: [questions[0]],
      }),
    );
  });

  test("submits only completed answers when optional questions are left blank", () => {
    const questions: QuestionnaireQuestion[] = Array.from({ length: 18 }, (_, index) => ({
      code: `q${index + 1}`,
      type: "Radio",
      value: index < 4 ? `option-${index + 1}` : "",
    }));

    const submission = buildQuestionnaireSubmission({ code: "scale", questions }, null);

    expect(submission.answers.map((question) => question.code)).toEqual(["q1", "q2", "q3", "q4"]);
  });

  test("requires at least one visible answer without changing optional-question semantics", () => {
    expect(SUBMIT_NO_ANSWER_MESSAGE).toBe("请至少完成一道题目后再提交");
    expect(hasAnyVisibleAnswer(questions)).toBe(true);
    expect(hasAnyVisibleAnswer(questions.map((item) => ({ ...item, value: "" })))).toBe(false);
  });

  test.each([
    [{ code: "q", type: "Text", title: "4. 姓名", value: "", validation_rules: [{ rule_type: "required", target_value: "1" }] }, "第4题为必填题"],
    [{ code: "q", type: "Text", title: "5. 描述", value: "短", validation_rules: [{ rule_type: "min_length", target_value: 3 }] }, "第5题最少字数为 3，请检查答题内容"],
    [{ code: "q", type: "CheckBox", title: "6. 多选", value: ["a"], validation_rules: [{ rule_type: "min_selections", target_value: 2 }] }, "第6题最少选择 2 个选项"],
  ])("returns the existing validation message", (question, message) => {
    expect(validateQuestion(question as QuestionnaireQuestion)).toEqual({ valid: false, message });
  });

  test("calculates progress from visible non-section questions", () => {
    expect(getQuestionnaireProgress(questions, "q2")).toEqual({
      current: 2,
      total: 2,
      percentage: 100,
    });
  });

  test("builds visible entries with the same source position and display number", () => {
    const entries = getVisibleQuestionEntries([
      { code: "section", type: "Section" },
      questions[0],
      questions[1],
      questions[2],
      { code: "q4", type: "Radio" },
    ]);

    expect(entries.map(({ question, sourceIndex, displayIndex }) => ({
      code: question.code,
      sourceIndex,
      displayIndex,
    }))).toEqual([
      { code: "section", sourceIndex: 0, displayIndex: 0 },
      { code: "q1", sourceIndex: 1, displayIndex: 0 },
      { code: "q2", sourceIndex: 2, displayIndex: 1 },
      { code: "q4", sourceIndex: 4, displayIndex: 2 },
    ]);
  });

  test("auto-advances only for single-choice questions without extend text", () => {
    const radioQuestion: QuestionnaireQuestion = {
      code: "q1",
      type: "Radio",
      options: [{ code: "a" }, { code: "b", allow_extend_text: "1" }],
    };

    expect(shouldAutoAdvanceOnSelect(radioQuestion, "a")).toBe(true);
    expect(shouldAutoAdvanceOnSelect(radioQuestion, "b")).toBe(false);
    expect(shouldAutoAdvanceOnSelect({ code: "q2", type: "CheckBox" }, ["a"])).toBe(false);
    expect(shouldAutoAdvanceOnSelect({ code: "q3", type: "Text" }, "hello")).toBe(false);
    expect(shouldAutoAdvanceOnSelect(radioQuestion, "")).toBe(false);
  });

  test("skips hidden questions when calculating adjacent visible steps", () => {
    const steppedQuestions: QuestionnaireQuestion[] = [
      { code: "q1", type: "Radio", value: "yes" },
      {
        code: "q2",
        type: "Radio",
        show_controller: {
          rule: "or",
          questions: [{ code: "q1", select_option_codes: ["no"] }],
        },
      },
      { code: "q3", type: "Radio" },
    ];

    expect(getAdjacentVisibleStep(steppedQuestions, 0, "next")).toBe(2);
    expect(getAdjacentVisibleStep(steppedQuestions, 2, "prev")).toBe(2);
  });
});


describe("published canonical validation rules", () => {
  const question = (type: string, value: unknown, ruleType: string, targetValue: unknown): QuestionnaireQuestion => ({
    code: "bound", type, value,
    validation_rules: [{ rule_type: ruleType, target_value: targetValue }],
  });

  test.each([
    ["min_length", "2", "中", false],
    ["min_length", 2, "中文", true],
    ["min_length", "2", "中文🙂", true],
    ["max_length", "2", "中", true],
    ["max_length", 2, "中文", true],
    ["max_length", "2", "中文🙂", false],
    ["min_length", 2, "中🙂", true],
    ["min_length", 2, "🙂", false],
    ["max_length", 2, "中🙂", true],
    ["max_length", 2, "🙂🙂🙂", false],
    ["max_length", 2, "e\u0301", true],
  ])("Text and Textarea enforce %s=%s on %s at Unicode character boundaries", (ruleType, target, value, valid) => {
    for (const type of ["Text", "Textarea"]) {
      expect(validateQuestion(question(type, value, ruleType, target)).valid).toBe(valid);
    }
  });

  test.each([
    ["min_selections", "2", ["a"], false],
    ["min_selections", 2, ["a", "b"], true],
    ["min_selections", "2", ["a", "b", "c"], true],
    ["max_selections", "2", ["a"], true],
    ["max_selections", 2, ["a", "b"], true],
    ["max_selections", "2", ["a", "b", "c"], false],
  ])("both multiple-choice controls enforce %s=%s", (ruleType, target, value, valid) => {
    for (const type of ["CheckBox", "ImageCheckBox"]) {
      expect(validateQuestion(question(type, value, ruleType, target)).valid).toBe(valid);
    }
  });

  test.each([
    ["Text", "max_length", "有值", false],
    ["Text", "min_length", "有值", true],
    ["CheckBox", "max_selections", ["a"], false],
    ["CheckBox", "min_selections", ["a"], true],
    ["Number", "min_value", -1, false],
    ["Number", "max_value", 1, false],
    ["Number", "min_value", 0, true],
    ["Number", "max_value", 0, true],
  ])("a configured zero is a real %s %s constraint", (type, ruleType, value, valid) => {
    for (const zero of [0, "0"]) {
      expect(validateQuestion(question(type, value, ruleType, zero)).valid).toBe(valid);
    }
  });

  test.each([undefined, null, "", "  \t\n", []])("optional empty %s skips configured constraints and is omitted", (value) => {
    const optional = { ...question("Text", value, "min_length", 2), validation_rules: [
      { rule_type: "min_length", target_value: 2 },
      { rule_type: "min_selections", target_value: 2 },
    ] };
    expect(validateQuestion(optional)).toEqual({ valid: true });
    expect(buildQuestionnaireSubmission({ questions: [optional] }).answers).toEqual([]);
    expect(validateQuestion({ ...optional, validation_rules: [...optional.validation_rules,
      { rule_type: "required", target_value: "1" },
    ] }).valid).toBe(false);
  });

  test("zero-valued numeric answers are present and retained", () => {
    const zero = { ...question("Number", 0, "max_value", 0), validation_rules: [
      { rule_type: "required", target_value: "1" }, { rule_type: "max_value", target_value: 0 },
    ] };
    expect(validateQuestion(zero)).toEqual({ valid: true });
    expect(buildQuestionnaireSubmission({ questions: [zero] }).answers).toEqual([zero]);
  });
});
