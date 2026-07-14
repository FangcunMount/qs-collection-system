import qlumePlaceholder from "@/assets/brand/qlume-lockup.png";
import { getEstimatedTime, getValidQuestionCount } from "@/modules/questionnaire/lib/questionUtils";
import type { QuestionnaireData } from "@/modules/questionnaire/types";
import type { Testee } from "@/store/testeeStore";
import type { EntryContext } from "@/store/entryContextStore";

import type { AssessmentReadyViewModel } from "../types";

export interface BuildAssessmentReadyViewModelInput {
  questionnaire: QuestionnaireData | null;
  testees: Testee[];
  selectedTesteeId: string;
  selectedTestee: Testee | null;
  entryContext: EntryContext | null;
  entryStatusText: string;
  isPersonality: boolean;
}

const resolveGender = (gender?: number): string => {
  if (gender === 1) return "男";
  if (gender === 2) return "女";
  return "其他";
};

export function buildAssessmentReadyViewModel({
  questionnaire,
  testees,
  selectedTesteeId,
  selectedTestee,
  entryContext,
  entryStatusText,
  isPersonality,
}: BuildAssessmentReadyViewModelInput): AssessmentReadyViewModel {
  const title = questionnaire?.title || (isPersonality ? "人格测评" : "测评准备");
  const questions = questionnaire?.questions ?? [];
  const hasQuestions = questions.length > 0;
  const clinician = entryContext?.clinician_name
    ? `${entryContext.clinician_name}${entryContext.clinician_title ? ` · ${entryContext.clinician_title}` : ""}`
    : undefined;
  const target = entryContext?.target_type || entryContext?.target_code
    ? `${entryContext?.target_type || "questionnaire"}${entryContext?.target_code ? ` · ${entryContext.target_code}` : ""}`
    : undefined;
  const hasEntryContext = Boolean(
    entryContext?.mpqrcodeid
      || entryContext?.entry_title
      || entryContext?.entry_description
      || entryContext?.clinician_name
      || entryContext?.target_code,
  );

  return {
    tone: isPersonality ? "personality" : "medical",
    coverImage: questionnaire?.thumbnail || qlumePlaceholder,
    title,
    subtitle: questionnaire?.subtitle,
    questionCount: hasQuestions
      ? getValidQuestionCount(questions)
      : (isPersonality ? "--" : 0),
    estimatedMinutes: hasQuestions
      ? getEstimatedTime(questionnaire ?? { questions })
      : (isPersonality ? "--" : 0),
    introTitle: isPersonality ? "测评简介" : "量表简介",
    introduction: questionnaire?.introduction
      || questionnaire?.description
      || `${title}将帮助你了解相关特征。完成答题后，系统将生成专属解读报告。`,
    testees: testees.map((testee) => ({
      id: testee.id,
      label: testee.legalName || "未命名",
    })),
    selectedTesteeId,
    selectedTesteeIndex: testees.findIndex((testee) => testee.id === selectedTesteeId),
    selectedTestee: selectedTestee ? {
      name: selectedTestee.legalName || "未命名",
      gender: resolveGender(selectedTestee.gender),
      birthday: selectedTestee.dob || undefined,
    } : undefined,
    entryContext: hasEntryContext ? {
      title: entryContext?.entry_title,
      clinician,
      description: entryContext?.entry_description,
      target,
      statusText: entryStatusText || undefined,
    } : undefined,
    startLabel: entryStatusText || "开始测评",
    startDisabled: !selectedTesteeId || Boolean(entryStatusText),
  };
}
