import {
  buildQuestionnaireSubmission,
  getQuestionnaireProgress,
  getVisibleAnswerQuestions,
  hasAnyVisibleAnswer,
  isQuestionVisible,
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

  test("keeps conditional visibility and filters hidden answers", () => {
    expect(isQuestionVisible(questions, questions[1].show_controller)).toBe(true);
    expect(isQuestionVisible(questions, questions[2].show_controller)).toBe(false);
    expect(getVisibleAnswerQuestions(questions).map((item) => item.code)).toEqual(["q1", "q2"]);
    expect(buildQuestionnaireSubmission({ code: "scale", questions }, null)).toEqual(
      expect.objectContaining({
        code: "scale",
        version: "1.0",
        answers: [questions[0], questions[1]],
      }),
    );
  });

  test("requires at least one visible answer without changing optional-question semantics", () => {
    expect(SUBMIT_NO_ANSWER_MESSAGE).toBe("请至少完成一道题目后再提交");
    expect(hasAnyVisibleAnswer(questions)).toBe(true);
    expect(hasAnyVisibleAnswer(questions.map((item) => ({ ...item, value: "" })))).toBe(false);
  });

  test.each([
    [{ code: "q", type: "Text", title: "4. 姓名", value: "", validation_rules: [{ rule_type: "required", target_value: "1" }] }, "第4题为必填题"],
    [{ code: "q", type: "Text", title: "5. 描述", value: "短", validation_rules: [{ rule_type: "min_words", target_value: 3 }] }, "第5题最少字数为 3，请检查答题内容"],
    [{ code: "q", type: "CheckBox", title: "6. 多选", value: ["a"], validation_rules: [{ rule_type: "min_select", target_value: 2 }] }, "第6题最少选择 2 个选项"],
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
});
