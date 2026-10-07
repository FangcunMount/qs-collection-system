import config from '@/config';
import { request } from '../servers';
import type { RequestLifetime } from '../requestLifetime';
import { isMBTIReferenceSelection, resolveMBTIReferences } from './mbtiReferences';
import type { MBTIReferenceSelection } from './mbtiReferences';
import { isMBTIThreeTopicOutput } from './mbtiThreeTopicOutput';
import type { MBTIThreeTopicOutput } from './mbtiThreeTopicOutput';

export type AIStatus = 'ready' | 'not_ready' | 'not_applicable' | 'pending' | 'generating' | 'generated' | 'failed';
export type SourceState = 'current' | 'stale' | 'unavailable' | 'unknown';
export interface EvidenceRef { kind: string; ref: string }
export interface AIInsight { kind: string; title: string; content: string; why_it_matters: string; evidence_refs: EvidenceRef[] }
export interface AISuggestion {
  origin: 'standard_derived' | 'generated_low_risk'; category: string; title: string; goal: string;
  actions: string[]; rationale: string; evidence_refs: EvidenceRef[]; source_suggestion_refs: string[]; caution?: string;
}
export interface AILegacyContent {
  schema_version: 'ai-explanation-output/v1'; summary: string;
  integrated_insights: AIInsight[]; suggestions: AISuggestion[]; limitations: string[];
}
export type AIContent = AILegacyContent | MBTIThreeTopicOutput;
export interface AIOutput {
  status: AIStatus; reason_code?: string; requestId?: string; artifact_id?: string;
  submission_state?: 'submitted' | 'accepted' | 'held' | 'rejected';
  reference_material?: MBTIReferenceSelection; reference_material_fingerprint?: string;
  source_report_id?: string; source_state: SourceState; content?: AIContent;
  failure?: { code: string; safe_message: string; retryable: boolean };
  created_at?: string; updated_at?: string; workflow_version?: number;
}
export interface AIScope { assessmentId: string; testeeId: string }
export class AIContractError extends Error {
  code = 'AI_CONTRACT_UNSUPPORTED';
  constructor() { super('当前版本暂不支持展示这份解读'); }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const eligibilityReasons = new Set([
  'unsupported_scene', 'unsupported_model_version', 'source_incomplete', 'source_conflict',
  'publication_missing', 'publication_paused', 'asset_invalid',
]);
const refs = (value: unknown) => Array.isArray(value) && value.every(ref => object(ref) &&
  ['dimension', 'overall_result', 'model_result', 'standard_suggestion'].includes(String(ref.kind)) && text(ref.ref));
const insight = (value: unknown) => object(value) && ['reinforcing_pattern', 'contrasting_pattern', 'combined_strength', 'combined_attention', 'context_dependent_pattern'].includes(String(value.kind)) &&
  text(value.title) && text(value.content) && text(value.why_it_matters) && refs(value.evidence_refs);
const suggestion = (value: unknown) => object(value) && ['standard_derived', 'generated_low_risk'].includes(String(value.origin)) &&
  text(value.category) && text(value.title) && text(value.goal) && strings(value.actions) && text(value.rationale) &&
  refs(value.evidence_refs) && strings(value.source_suggestion_refs) &&
  (value.origin !== 'standard_derived' || value.source_suggestion_refs.length > 0) && value.actions.length > 0 && (value.caution === undefined || typeof value.caution === 'string');

export function validateExplanationView(input: unknown): AIOutput {
  if (!object(input)) throw new AIContractError();
  let value: Record<string, unknown> = input;
  if ( !['ready','not_ready','not_applicable','pending','generating','generated','failed'].includes(String(value.status)) ||
      !['current','stale','unavailable','unknown'].includes(String(value.source_state))) throw new AIContractError();
  for (const key of ['requestId','artifact_id','source_report_id','reason_code','created_at','updated_at']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new AIContractError();
  }
  if (['pending','generating','generated','failed'].includes(String(value.status)) && !text(value.requestId)) throw new AIContractError();
  if (value.submission_state !== undefined &&
      !(['submitted', 'accepted', 'held'].includes(String(value.submission_state)) && value.status === 'pending' ||
        value.submission_state === 'rejected' && value.status === 'failed')) throw new AIContractError();
  if (value.failure !== undefined && (!object(value.failure) || !text(value.failure.code) ||
      typeof value.failure.safe_message !== 'string' || typeof value.failure.retryable !== 'boolean')) throw new AIContractError();
  if (value.status === 'failed' && !value.failure) throw new AIContractError();
  if (value.status === 'generated') {
    // Collection's Go DTO encodes an empty repeated source_suggestion_refs as null.
    // This field alone is allowed empty for generated_low_risk; missing fields remain invalid.
    if (object(value.content) && Array.isArray(value.content.suggestions)) {
      value = { ...value, content: { ...value.content, suggestions: value.content.suggestions.map(item =>
        object(item) && item.origin === 'generated_low_risk' && item.source_suggestion_refs === null
          ? { ...item, source_suggestion_refs: [] } : item) } };
    }
    const content = value.content;
    if (!text(value.artifact_id) || !text(value.source_report_id) || !object(content)) throw new AIContractError();
    if (content.schema_version === 'ai-explanation-output/v2') {
      if (!isMBTIThreeTopicOutput(content)) throw new AIContractError();
    } else if (content.schema_version !== 'ai-explanation-output/v1' ||
        !text(content.summary) || !Array.isArray(content.integrated_insights) || content.integrated_insights.length === 0 || !content.integrated_insights.every(insight) ||
        !Array.isArray(content.suggestions) || content.suggestions.length === 0 || !content.suggestions.every(suggestion) || !strings(content.limitations) || content.limitations.length === 0) throw new AIContractError();
  } else if (value.content !== undefined) throw new AIContractError();
  if (value.reference_material !== undefined || value.reference_material_fingerprint !== undefined) {
    if (value.status !== 'generated' || !isMBTIThreeTopicOutput(value.content) ||
      !isMBTIReferenceSelection(value.reference_material) || typeof value.reference_material_fingerprint !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(value.reference_material_fingerprint)) throw new AIContractError();
    const material = value.reference_material;
    if (value.content.sections.some(section => [...section.insights, ...section.reflection_questions, ...section.actions]
      .some(item => !resolveMBTIReferences(material, item, section.topic)))) throw new AIContractError();
  }
  return value as unknown as AIOutput;
}
const scopePath = ({ assessmentId, testeeId }: AIScope) => {
  if (!isReportId(assessmentId) || !isReportId(testeeId)) throw new Error('测评参数不完整');
  return `/assessments/${encodeURIComponent(assessmentId)}`;
};
const options = (scope: AIScope, lifetime?: RequestLifetime) => ({
  host: config.collectionHost, needToken: true, suppressErrorToast: true,
  retry429: false, refreshOnForbidden: false, logPolicy: 'metadata_only', allowInteractiveLogin: false,
  timeout: 15000, lifetime, params: { testee_id: scope.testeeId },
});
export interface AIWorkflowCommand { requestId: string; reportId: string }
export const isWorkflowRequestId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) && id !== '00000000-0000-0000-0000-000000000000';
export const isReportId = (id: string) => /^[1-9]\d{0,19}$/.test(id) && (id.length < 20 || id <= '18446744073709551615');

export async function getAIExplanationCapability(scope: AIScope, lifetime?: RequestLifetime): Promise<AIOutput> {
  const value = await request(`${scopePath(scope)}/ai-workflows/source`, {}, { ...options(scope, lifetime), method: 'GET' });
  if (!object(value) || !['ready', 'not_ready', 'not_applicable'].includes(String(value.status))) throw new AIContractError();
  if (value.status === 'ready') {
    if (typeof value.report_id !== 'string' || !isReportId(value.report_id) || !text(value.source_version)) throw new AIContractError();
    const eligibility = value.ai_eligibility;
    if (!object(eligibility) ||
        !(eligibility.status === 'available' && (eligibility.reason_code === undefined || eligibility.reason_code === '') ||
          eligibility.status === 'unavailable' && eligibilityReasons.has(String(eligibility.reason_code)))) throw new AIContractError();
    return {
      status: eligibility.status === 'available' ? 'ready' : 'not_applicable',
      source_report_id: value.report_id, source_state: 'current',
      reason_code: eligibility.status === 'unavailable' ? String(eligibility.reason_code) : undefined,
    };
  } else if (value.report_id !== undefined || value.source_version !== undefined) throw new AIContractError();
  return { status: value.status as AIStatus, source_state: 'unavailable',
    reason_code: value.status === 'not_applicable' ? 'source_not_supported' : undefined };
}

// The view uses the same request UUID as the workflow transport and durable pointer.
export async function requestAIExplanation(scope: AIScope, command: AIWorkflowCommand, lifetime?: RequestLifetime): Promise<AIOutput> {
  if (!isWorkflowRequestId(command.requestId) || !isReportId(command.reportId)) throw new AIContractError();
  const value = await request(`${scopePath(scope)}/ai-workflows`, { request_id: command.requestId, report_id: command.reportId }, {
    ...options(scope, lifetime), method: 'POST',
  });
  if (!object(value) || value.request_id !== command.requestId ||
      !['accepted', 'submitted'].includes(String(value.status))) throw new AIContractError();
  if (value.status === 'submitted' &&
      (value.operation_id !== command.requestId || value.command_id !== command.requestId)) throw new AIContractError();
  // Submission is not AI admission. Read only our scoped endpoints, never a
  // returned status_url, and never replay a command while checking status.
  return { status: 'pending', requestId: command.requestId, source_report_id: command.reportId, source_state: 'unknown', workflow_version: 0,
    ...(value.status === 'submitted' ? { submission_state: 'submitted' as const } : {}) };
}

async function readSubmission(scope: AIScope, requestId: string, lifetime?: RequestLifetime): Promise<AIOutput> {
  const value = await request(`/interpretation/ai-workflow/operations/${encodeURIComponent(requestId)}`, {}, {
    ...options(scope, lifetime), method: 'GET',
    params: { testee_id: scope.testeeId, assessment_id: scope.assessmentId, request_id: requestId },
  });
  if (!object(value) || value.operation_id !== requestId || value.command_id !== requestId || value.resource_id !== requestId ||
      !['staged', 'awaiting_receipt', 'confirmed', 'held'].includes(String(value.transport_status)) ||
      value.decision !== undefined && typeof value.decision !== 'string') throw new AIContractError();
  const decision = value.decision === undefined ? '' : value.decision;
  const submitted = value.status === 'submitted' && decision === '' && value.transport_status !== 'confirmed';
  const accepted = value.status === 'accepted' && decision === 'accepted' && value.transport_status === 'confirmed';
  const rejected = value.status === 'rejected' && decision === 'rejected' && value.transport_status === 'confirmed';
  const held = value.status === 'held' && decision === 'held' && value.transport_status === 'held';
  if (!submitted && !accepted && !rejected && !held) throw new AIContractError();
  return validateExplanationView({ status: rejected ? 'failed' : 'pending', requestId, source_state: 'unknown',
    submission_state: rejected ? 'rejected' : held || value.transport_status === 'held' ? 'held' : accepted ? 'accepted' : 'submitted',
    failure: rejected ? { code: 'submission_rejected', safe_message: '本次解读请求未被接收，请联系工作人员核对。标准报告仍可正常阅读。', retryable: false } : undefined });
}

export function parseWorkflowResult(value: unknown, requestId: string): AIOutput {
  if (!object(value) || value.request_id !== requestId || !isWorkflowRequestId(requestId) ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 0) throw new AIContractError();
  const statusMap: Record<string, AIStatus> = { accepted: 'pending', queued: 'pending', running: 'generating', completed: 'generated', blocked: 'failed', cancelled: 'failed' };
  const status = statusMap[String(value.status)];
  if (!status || value.status !== 'accepted' && value.version === 0) throw new AIContractError();
  if (status === 'generated' && (typeof value.report_id !== 'string' || !isReportId(value.report_id) || !text(value.source_version))) throw new AIContractError();
  return validateExplanationView({ status, requestId: requestId, workflow_version: value.version, source_state: 'unknown',
    artifact_id: value.artifact_id, reference_material: value.reference_material,
    reference_material_fingerprint: value.reference_material_fingerprint, source_report_id: value.report_id, content: value.content,
    failure: status === 'failed' ? { code: `workflow_${String(value.status)}`, safe_message: value.status === 'cancelled' ? '本次解读已停止。' : '本次解读暂未完成，可稍后刷新状态或联系工作人员。', retryable: false } : undefined });
}

export async function getAIExplanation(scope: AIScope, requestId: string, lifetime?: RequestLifetime): Promise<AIOutput> {
  if (!isWorkflowRequestId(requestId)) throw new AIContractError();
  let output: AIOutput;
  try {
    output = parseWorkflowResult(await request(`${scopePath(scope)}/ai-workflows/${encodeURIComponent(requestId)}`, {}, {
      ...options(scope, lifetime), method: 'GET',
    }), requestId);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 404) throw error;
    return readSubmission(scope, requestId, lifetime);
  }
  // An existing QS request with no AI projection is not an admission receipt.
  // Older servers may not expose operations; only a 404 retains that read.
  if (output.status === 'pending' && output.workflow_version === 0) {
    try { return await readSubmission(scope, requestId, lifetime); }
    catch (error) { if ((error as { statusCode?: number }).statusCode !== 404) throw error; }
  }
  if (output.status !== 'generated') return output;
  try {
    const source = await getAIExplanationCapability(scope, lifetime);
    return { ...output, source_state: source.source_report_id ?
      (source.source_report_id === output.source_report_id ? 'current' : 'stale') : 'unavailable' };
  } catch (error) {
    const err = error as { statusCode?: number; reason?: string; code?: string };
    if (err.statusCode === 401 || err.statusCode === 403 || err.reason || err.code === 'AI_CONTRACT_UNSUPPORTED') throw error;
    return { ...output, source_state: 'unavailable' };
  }
}
