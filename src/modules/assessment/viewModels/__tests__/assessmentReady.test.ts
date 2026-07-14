import { buildAssessmentReadyViewModel } from "../assessmentReady";

describe("assessment ready view model", () => {
  const testees = [
    { id: "t1", legalName: "小明", gender: 1, dob: "2018-01-02" },
    { id: "t2", legalName: "小雨", gender: 2, dob: "2019-03-04" },
  ];

  test("normalizes questionnaire, selected profile and entry context", () => {
    const viewModel = buildAssessmentReadyViewModel({
      questionnaire: {
        title: "儿童睡眠量表",
        questions: [
          { code: "section", type: "Section" },
          { code: "q1", type: "Radio" },
          { code: "q2", type: "Text" },
        ],
      },
      testees,
      selectedTesteeId: "t2",
      selectedTestee: testees[1],
      entryContext: {
        entry_title: "医生推荐",
        clinician_name: "张医生",
        clinician_title: "主治医师",
      },
      entryStatusText: "",
      isPersonality: false,
    });

    expect(viewModel).toEqual(expect.objectContaining({
      tone: "medical",
      title: "儿童睡眠量表",
      questionCount: 2,
      estimatedMinutes: 1,
      selectedTesteeIndex: 1,
      startDisabled: false,
    }));
    expect(viewModel.selectedTestee).toEqual({ name: "小雨", gender: "女", birthday: "2019-03-04" });
    expect(viewModel.entryContext?.clinician).toBe("张医生 · 主治医师");
  });

  test("keeps personality placeholders and disabled entry status", () => {
    const viewModel = buildAssessmentReadyViewModel({
      questionnaire: null,
      testees,
      selectedTesteeId: "",
      selectedTestee: null,
      entryContext: null,
      entryStatusText: "当前入口已过期",
      isPersonality: true,
    });

    expect(viewModel).toEqual(expect.objectContaining({
      tone: "personality",
      title: "人格测评",
      questionCount: "--",
      estimatedMinutes: "--",
      startLabel: "当前入口已过期",
      startDisabled: true,
    }));
    expect(viewModel.coverImage).toBeTruthy();
  });
});
