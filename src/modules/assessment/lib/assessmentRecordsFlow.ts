import { ASSESSMENT_KIND, resolveAssessmentKind } from "@/shared/lib/assessmentKind";
import { getAssessmentStatus } from "@/shared/lib/statusFormatters";
import { isReportReadable } from "./reportReadiness";

import type {
  AssessmentRecordScaleOption,
  AssessmentRecordViewModel,
} from "../types";

type RecordSource = Record<string, unknown>;

const stringValue = (value: unknown): string => value == null ? "" : String(value);

export const formatRecordDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const resolveRecordDateRange = (
  timeRange: string,
  today = new Date(),
): { dateFrom?: string; dateTo?: string } => {
  if (timeRange !== "7" && timeRange !== "30") return {};
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  const start = new Date(today);
  start.setDate(start.getDate() - Number(timeRange));
  return { dateFrom: formatRecordDate(start), dateTo: formatRecordDate(end) };
};

export const toAssessmentRecordViewModel = (record: RecordSource): AssessmentRecordViewModel => {
  const assessmentKind = resolveAssessmentKind(record) || ASSESSMENT_KIND.MEDICAL;
  const sourceStatus = stringValue(record.status);
  const status = getAssessmentStatus(record) as AssessmentRecordViewModel["status"];
  const scaleCode = stringValue(record.scale_code || record.questionnaire_code);

  return {
    id: stringValue(record.id),
    answerSheetId: stringValue(record.answer_sheet_id),
    title: stringValue(record.title) || "未知量表",
    description: stringValue(record.description),
    createdAt: stringValue(record.createtime) || undefined,
    status,
    sourceStatus,
    score: record.score == null ? null : record.score as string | number,
    riskLevel: stringValue(record.risk_level),
    assessmentKind,
    tone: assessmentKind,
    reportReadable: isReportReadable(sourceStatus),
    showTrendAction: assessmentKind === ASSESSMENT_KIND.MEDICAL,
    scaleCode,
    scaleName: stringValue(record.scale_name || record.title) || "未知量表",
  };
};

export const buildRecordScaleOptions = (
  records: AssessmentRecordViewModel[],
  selectedScaleCode = "",
): AssessmentRecordScaleOption[] => {
  const scaleMap = new Map<string, string>();
  records.forEach((record) => {
    if (record.scaleCode && !scaleMap.has(record.scaleCode)) {
      scaleMap.set(record.scaleCode, record.scaleName);
    }
  });
  if (selectedScaleCode && !scaleMap.has(selectedScaleCode)) {
    scaleMap.set(selectedScaleCode, selectedScaleCode);
  }
  return [
    { code: "", name: "全部量表" },
    ...Array.from(scaleMap, ([code, name]) => ({ code, name })),
  ];
};
