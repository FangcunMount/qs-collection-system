import type { DomainTone } from "@/shared/ui/types";
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

export type AssessmentRecordStatus =
  | "pending"
  | "generating"
  | "failed"
  | "normal"
  | "abnormal";

export interface AssessmentRecordViewModel {
  id: string;
  answerSheetId: string;
  title: string;
  description: string;
  createdAt?: string;
  status: AssessmentRecordStatus;
  sourceStatus: string;
  score: string | number | null;
  riskLevel: string;
  assessmentKind: "medical" | "personality" | "ability";
  tone: DomainTone;
  reportReadable: boolean;
  showTrendAction: boolean;
  scaleCode: string;
  scaleName: string;
}

export interface AssessmentRecordScaleOption {
  code: string;
  name: string;
}

export interface AssessmentRecordPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssessmentResponseQuestion {
  code: string;
  type: string;
  title: string;
  value?: unknown;
  score?: number;
  options?: Array<Record<string, unknown> & { code?: string; is_select?: string }>;
  [key: string]: unknown;
}

export interface AssessmentResponseAnswer {
  question_code: string;
  value?: string;
  score?: number;
  [key: string]: unknown;
}

export interface MedicalReportSuggestionViewModel {
  category: string;
  content: string;
  factorCode?: string;
}

export interface MedicalReportFactorViewModel {
  factorCode: string;
  title: string;
  content: string;
  score: number | null;
  maxScore: number | null;
  riskLevel: string;
  suggestion: string;
}

export interface MedicalReportViewModel {
  tone: "medical";
  scaleName: string;
  scaleCode: string;
  riskLevel: string;
  suggestions: MedicalReportSuggestionViewModel[];
  createdAt: string;
  testeeName: string;
  testeeId: string;
  total: { content: string; score: number } | null;
  factors: MedicalReportFactorViewModel[];
  hasContent: boolean;
}

export interface PersonalityReportDimensionViewModel {
  factor_code: string;
  title: string;
  description: string;
  score: number | null;
  max_score: number | null;
  risk_level: string;
  suggestion: string;
}

export interface PersonalityReportSectionViewModel {
  key: string;
  title: string;
  content: string;
  items: unknown[];
}

export interface PersonalityReportViewModel {
  tone: "personality";
  modelTitle: string;
  modelCode: string;
  testeeName: string;
  testeeId: string;
  createdAt: string;
  outcome: {
    code: string;
    title: string;
    summary: string;
    rarityLabel: string;
    percentile: number | null;
  };
  hero: { conclusion: string; modelExtra: Record<string, unknown> };
  dimensions: PersonalityReportDimensionViewModel[];
  suggestions: Array<{ category: string; content: string }>;
  sections: PersonalityReportSectionViewModel[];
  hasContent: boolean;
}

export type ReportWaitPhase = "processing" | "success" | "failure" | "degraded";

export interface ReportWaitViewModel {
  phase: ReportWaitPhase;
  title: string;
  description: string;
  stageLabel: string;
  showAnimation: boolean;
  canRetry: boolean;
}
