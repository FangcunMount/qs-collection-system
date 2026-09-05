import config from '@/config';
import { request } from '../servers';
import type { RequestLifetime } from '../requestLifetime';

export type AIStatus = 'ready' | 'not_ready' | 'not_applicable' | 'pending' | 'generating' | 'generated' | 'failed';
export type SourceState = 'current' | 'stale' | 'unavailable' | 'unknown';
export interface EvidenceRef { kind: string; ref: string }
export interface AIInsight { kind: string; title: string; content: string; why_it_matters: string; evidence_refs: EvidenceRef[] }
export interface AISuggestion {
  origin: 'standard_derived' | 'generated_low_risk'; category: string; title: string; goal: string;
  actions: string[]; rationale: string; evidence_refs: EvidenceRef[]; source_suggestion_refs: string[]; caution?: string;
}
export interface AIContent {
  schema_version: 'ai-explanation-output/v1'; summary: string;
  integrated_insights: AIInsight[]; suggestions: AISuggestion[]; limitations: string[];
}
export interface AIOutput {
  status: AIStatus; reason_code?: string; generation_id?: string; artifact_id?: string;
  source_report_id?: string; source_state: SourceState; content?: AIContent;
  failure?: { code: string; safe_message: string; retryable: boolean };
  created_at?: string; updated_at?: string;
}
export interface AIScope { assessmentId: string; testeeId: string }
export class AIContractError extends Error {
  code = 'AI_CONTRACT_UNSUPPORTED';
  constructor() { super('当前版本暂不支持展示这份解读'); }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const refs = (value: unknown) => Array.isArray(value) && value.every(ref => object(ref) &&
  ['dimension', 'overall_result', 'model_result', 'standard_suggestion'].includes(String(ref.kind)) && text(ref.ref));
const insight = (value: unknown) => object(value) && ['reinforcing_pattern', 'contrasting_pattern', 'combined_strength', 'combined_attention', 'context_dependent_pattern'].includes(String(value.kind)) &&
  text(value.title) && text(value.content) && text(value.why_it_matters) && refs(value.evidence_refs);
const suggestion = (value: unknown) => object(value) && ['standard_derived', 'generated_low_risk'].includes(String(value.origin)) &&
  text(value.category) && text(value.title) && text(value.goal) && strings(value.actions) && text(value.rationale) &&
  refs(value.evidence_refs) && strings(value.source_suggestion_refs) &&
  (value.origin !== 'standard_derived' || value.source_suggestion_refs.length > 0) && value.actions.length > 0 && (value.caution === undefined || typeof value.caution === 'string');

export function parseAIOutput(input: unknown): AIOutput {
  if (!object(input)) throw new AIContractError();
  let value: Record<string, unknown> = input;
  if ( !['ready','not_ready','not_applicable','pending','generating','generated','failed'].includes(String(value.status)) ||
      !['current','stale','unavailable','unknown'].includes(String(value.source_state))) throw new AIContractError();
  for (const key of ['generation_id','artifact_id','source_report_id','reason_code','created_at','updated_at']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new AIContractError();
  }
  if (['pending','generating','generated','failed'].includes(String(value.status)) && !text(value.generation_id)) throw new AIContractError();
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
    if (!text(value.artifact_id) || !text(value.source_report_id) || !object(content) || content.schema_version !== 'ai-explanation-output/v1' ||
        !text(content.summary) || !Array.isArray(content.integrated_insights) || content.integrated_insights.length === 0 || !content.integrated_insights.every(insight) ||
        !Array.isArray(content.suggestions) || content.suggestions.length === 0 || !content.suggestions.every(suggestion) || !strings(content.limitations) || content.limitations.length === 0) throw new AIContractError();
  } else if (value.content !== undefined) throw new AIContractError();
  return value as unknown as AIOutput;
}
const scopePath = ({ assessmentId, testeeId }: AIScope) => {
  if (!/^[1-9]\d*$/.test(assessmentId) || !/^[1-9]\d*$/.test(testeeId)) throw new Error('测评参数不完整');
  return `/assessments/${encodeURIComponent(assessmentId)}`;
};
const options = (scope: AIScope, lifetime?: RequestLifetime) => ({
  host: config.collectionHost, needToken: true, suppressErrorToast: true,
  retry429: false, refreshOnForbidden: false, logPolicy: 'metadata_only', allowInteractiveLogin: false,
  timeout: 15000, lifetime, params: { testee_id: scope.testeeId },
});
export async function getAIExplanationCapability(scope: AIScope, lifetime?: RequestLifetime): Promise<AIOutput> {
  const path = scopePath(scope);
  const output = parseAIOutput(await request(`${path}/ai-explanation/capability`, {}, {
    ...options(scope, lifetime), method: 'GET', params: { testee_id: scope.testeeId, locale: 'zh-CN' },
  }));
  if (!['ready','not_ready','not_applicable'].includes(output.status)) throw new AIContractError();
  return output;
}
export async function requestAIExplanation(scope: AIScope, lifetime?: RequestLifetime): Promise<AIOutput> {
  const output = parseAIOutput(await request(`${scopePath(scope)}/ai-explanations`, { locale: 'zh-CN', focus_areas: [] }, {
    ...options(scope, lifetime), method: 'POST',
  }));
  if (output.status === 'ready') throw new AIContractError();
  return output;
}
export async function getAIExplanation(scope: AIScope, generationId: string, lifetime?: RequestLifetime): Promise<AIOutput> {
  if (!generationId) throw new Error('解读参数不完整');
  const output = parseAIOutput(await request(`${scopePath(scope)}/ai-explanations/${encodeURIComponent(generationId)}`, {}, {
    ...options(scope, lifetime), method: 'GET',
  }));
  if (output.generation_id !== generationId || output.status === 'ready') throw new AIContractError();
  return output;
}
