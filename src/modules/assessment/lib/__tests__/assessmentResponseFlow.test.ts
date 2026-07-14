import { mergeQuestionsWithAnswers } from "../assessmentResponseFlow";

describe("assessment response merge", () => {
  test("preserves raw source questions while applying answer values", () => {
    const questions = [{
      code: "q1",
      type: "CheckBox",
      title: "选择症状",
      options: [{ code: "a" }, { code: "b" }],
    }];
    const result = mergeQuestionsWithAnswers(questions, [{
      question_code: "q1",
      value: '["b"]',
      score: 2,
    }]);

    expect(result[0]).toMatchObject({ title: "1. 选择症状", value: ["b"], score: 2 });
    expect(result[0].options).toEqual([
      { code: "a", is_select: "0" },
      { code: "b", is_select: "1" },
    ]);
    expect(questions[0].title).toBe("选择症状");
  });

  test("keeps malformed multi-choice values visible instead of discarding them", () => {
    expect(mergeQuestionsWithAnswers(
      [{ code: "q1", type: "ImageCheckBox", title: "图片选择" }],
      [{ question_code: "q1", value: "legacy-value" }],
    )[0].value).toBe("legacy-value");
  });
});
