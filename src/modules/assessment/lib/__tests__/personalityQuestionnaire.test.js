import { prepareQuestionnaireFromSession } from "../personalityQuestionnaire";

describe("prepareQuestionnaireFromSession", () => {
  test("preserves the published question title and prompt", () => {
    const questionnaire = prepareQuestionnaireFromSession({
      model: { code: "MBTI", questionnaireCode: "MBTI", questionnaireVersion: "1.0" },
      submitContract: { questionnaire_code: "MBTI", questionnaire_version: "1.0" },
      questionnaire: {
        questions: [{
          code: "Q1",
          type: "Radio",
          title: "我更享受独处",
          tips: "请按你通常的状态作答",
          options: [],
        }],
      },
    });

    expect(questionnaire.questions[0]).toMatchObject({
      title: "我更享受独处",
      tips: "请按你通常的状态作答",
      value: "",
    });
  });
});
