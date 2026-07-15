import {
  buildRecordScaleOptions,
  resolveRecordDateRange,
  toAssessmentRecordViewModel,
} from "../assessmentRecordsFlow";
import { normalizeMedicalAssessmentRecord } from "../../services/medicalAssessmentRecordMapper";

describe("assessment record view models", () => {
  test("keeps medical report and trend semantics", () => {
    const record = toAssessmentRecordViewModel({
      id: 9,
      answer_sheet_id: "answer-1",
      title: "儿童焦虑量表",
      status: "evaluated",
      risk_level: "high",
      score: 18,
      assessment_kind: "medical",
      scale_code: "SCARED",
    });

    expect(record).toMatchObject({
      id: "9",
      answerSheetId: "answer-1",
      status: "abnormal",
      reportReadable: true,
      showTrendAction: true,
      tone: "medical",
    });
  });

  test("keeps personality reports separate and without trend action", () => {
    expect(toAssessmentRecordViewModel({
      id: "p1",
      title: "人格测评",
      status: "interpreted",
      kind: "personality",
      model_code: "big-five",
    })).toMatchObject({
      assessmentKind: "personality",
      reportReadable: true,
      showTrendAction: false,
      tone: "personality",
    });
  });

  test("normalizes behavioral rating records as ability assessments", () => {
    expect(toAssessmentRecordViewModel({
      id: "b1",
      title: "执行功能评估",
      status: "interpreted",
      kind: "behavioral_rating",
      questionnaire_code: "EXECUTIVE_FUNCTION_36",
    })).toMatchObject({
      assessmentKind: "ability",
      tone: "ability",
      showTrendAction: false,
    });
  });

  test("maps behavioral rating from model.kind in assessment list DTO", () => {
    const normalized = normalizeMedicalAssessmentRecord({
      id: "b2",
      status: "evaluated",
      questionnaire_code: "EXECUTIVE_FUNCTION_36",
      model: {
        code: "EXECUTIVE_FUNCTION_36",
        title: "执行功能评估",
        kind: "behavioral_rating",
      },
    });

    expect(toAssessmentRecordViewModel(normalized)).toMatchObject({
      assessmentKind: "ability",
      title: "执行功能评估",
      tone: "ability",
    });
  });

  test("builds date and scale filters without losing the active scale", () => {
    expect(resolveRecordDateRange("7", new Date(2026, 6, 14))).toEqual({
      dateFrom: "2026-07-07",
      dateTo: "2026-07-15",
    });
    expect(resolveRecordDateRange("")).toEqual({});
    expect(buildRecordScaleOptions([], "legacy-scale")).toEqual([
      { code: "", name: "全部量表" },
      { code: "legacy-scale", name: "legacy-scale" },
    ]);
  });
});
