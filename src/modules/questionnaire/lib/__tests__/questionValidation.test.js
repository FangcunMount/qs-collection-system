import { resolveQuestionTips } from "../questionValidation";

describe("resolveQuestionTips", () => {
  test.each([
    [{ tips: "优先提示" }, "优先提示"],
    [{ prompt: "接口提示" }, "接口提示"],
    [{ description: "兼容提示" }, "兼容提示"],
  ])("resolves a question prompt from supported fields", (question, expected) => {
    expect(resolveQuestionTips(question)).toBe(expected);
  });
});
