import type { DomainTone } from "@/shared/ui";
import type {
  AssessmentSubmitContract,
  QuestionnaireData,
  QuestionnaireWrittenCallback,
} from "@/modules/questionnaire/types";

export interface AssessmentReadyTesteeViewModel {
  id: string;
  label: string;
}

export interface AssessmentReadyTesteeDetailViewModel {
  name: string;
  gender: string;
  birthday?: string;
}

export interface AssessmentEntryContextViewModel {
  title?: string;
  clinician?: string;
  description?: string;
  target?: string;
  statusText?: string;
}

export interface AssessmentReadyViewModel {
  tone: DomainTone;
  coverImage: string;
  title: string;
  subtitle?: string;
  questionCount: number | "--";
  estimatedMinutes: number | "--";
  introTitle: string;
  introduction: string;
  testees: AssessmentReadyTesteeViewModel[];
  selectedTesteeId: string;
  selectedTesteeIndex: number;
  selectedTestee?: AssessmentReadyTesteeDetailViewModel;
  entryContext?: AssessmentEntryContextViewModel;
  startLabel: string;
  startDisabled: boolean;
}

export interface AssessmentAnsweringViewModel {
  questionnaireCode: string | null;
  questionnaire: QuestionnaireData | null;
  submitContract: AssessmentSubmitContract | null;
  subSignid: string;
  isSinglePage: boolean;
  isPersonality: boolean;
  canSubmit: boolean;
  onWritten: QuestionnaireWrittenCallback;
}
