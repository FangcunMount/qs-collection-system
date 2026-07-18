export type QuestionnaireVariant = "default" | "personality";

export interface ValidationRule {
  rule_type: string;
  target_value?: unknown;
}

export interface ShowControllerQuestion {
  code: string;
  select_option_codes: Array<string | string[]>;
}

export interface ShowController {
  rule?: "or" | "and" | string;
  questions?: ShowControllerQuestion[];
}

export interface QuestionnaireOption {
  extend_content?: unknown;
  [key: string]: unknown;
}

export interface QuestionnaireQuestion {
  code: string;
  type: string;
  title?: string;
  placeholder?: string;
  value?: unknown;
  score?: number;
  options?: QuestionnaireOption[];
  show_controller?: ShowController | "" | null;
  validation_rules?: ValidationRule[];
  [key: string]: unknown;
}

export interface WriterRole {
  code: string;
  name: string;
}

export interface WriterRoleOption {
  label: string;
  value: string;
}

export interface QuestionnaireData {
  code?: string;
  version?: string;
  type?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  introduction?: string;
  description?: string;
  thumbnail?: string;
  estimated_time?: number;
  questions: QuestionnaireQuestion[];
  writer_roles?: WriterRole[];
  questionnaire?: QuestionnaireData;
  [key: string]: unknown;
}

export interface AssessmentSubmitContract {
  questionnaire_code?: string;
  questionnaire_version?: string;
  testee_id?: string;
  model_code?: string;
  [key: string]: unknown;
}

export interface QuestionnaireSubmissionData {
  name?: string;
  title?: string;
  code?: string;
  version: string;
  answers: QuestionnaireQuestion[];
}

export interface QuestionnaireSubmitResult {
  id?: string;
  answersheet_id?: string;
  assessment_id?: string;
	request_id?: string;
	status?: string;
	submit_mode?: string;
  submission_attempt?: unknown;
  [key: string]: unknown;
}

export type QuestionnaireWrittenCallback = (
  answersheetId: string,
  assessmentId: string,
  requestId: string,
  result?: QuestionnaireSubmitResult,
) => Promise<void> | void;

export interface QuestionnaireControllerProps {
  canSubmit: boolean;
  questionnaireCode: string | null;
  initialQuestionnaire: QuestionnaireData | null;
  submitContract: AssessmentSubmitContract | null;
  subSignid: string;
  writedCallback: QuestionnaireWrittenCallback;
}
