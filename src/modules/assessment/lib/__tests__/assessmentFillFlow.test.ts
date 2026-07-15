import {
  resolveQuestionnaireSinglePageMode,
  resolveTesteeBootstrap,
} from "../assessmentFillFlow";
import { resolvePostSubmitNavigationKind } from "../assessmentSubmitNavigation";

describe("assessment fill controller decisions", () => {
  const testees = [
    { id: "t1", legalName: "小明", dob: "" },
    { id: "t2", legalName: "小雨", dob: "" },
  ];

  test("routes no, one and multiple profiles without hidden auto-selection", () => {
    expect(resolveTesteeBootstrap([])).toEqual({ kind: "create_testee" });
    expect(resolveTesteeBootstrap(testees.slice(0, 1))).toEqual({
      kind: "load_single",
      testeeId: "t1",
    });
    expect(resolveTesteeBootstrap(testees)).toEqual({ kind: "await_selection" });
    expect(resolveTesteeBootstrap(testees, "explicit")).toEqual({
      kind: "load_selected",
      testeeId: "explicit",
    });
  });

  test("keeps personality and short medical questionnaires in single-question mode", () => {
    expect(resolveQuestionnaireSinglePageMode({
      questionnaireType: "PersonalityAssessment",
      questionCount: 60,
      requestedSinglePage: false,
      isPersonalityFlow: false,
    })).toBe(true);
    expect(resolveQuestionnaireSinglePageMode({
      questionnaireType: "MedicalScale",
      questionCount: 19,
      requestedSinglePage: false,
      isPersonalityFlow: false,
    })).toBe(true);
    expect(resolveQuestionnaireSinglePageMode({
      questionnaireType: "Survey",
      questionCount: 10,
      requestedSinglePage: false,
      isPersonalityFlow: false,
    })).toBe(false);
  });

  test("keeps medical and personality post-submit routing distinct", () => {
    expect(resolvePostSubmitNavigationKind({
      questionnaireType: "MedicalScale",
      isPersonalityFlow: false,
    })).toBe("medical_pending");
    expect(resolvePostSubmitNavigationKind({
      questionnaireType: "PersonalityAssessment",
      isPersonalityFlow: true,
    })).toBe("personality_pending");
  });

  test("routes ability assessments to report pending instead of answersheet", () => {
    expect(resolvePostSubmitNavigationKind({
      questionnaireType: "BehavioralRating",
      isPersonalityFlow: false,
    })).toBe("ability_pending");
    expect(resolvePostSubmitNavigationKind({
      questionnaireType: "Survey",
      assessmentKind: "ability",
      isPersonalityFlow: false,
    })).toBe("ability_pending");
    expect(resolvePostSubmitNavigationKind({
      questionnaireType: "Survey",
      isPersonalityFlow: false,
    })).toBe("survey_response");
  });
});
