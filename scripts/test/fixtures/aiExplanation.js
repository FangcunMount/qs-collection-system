export const ready = { status: 'ready', source_state: 'current', source_report_id: 'report-1' };
export const pending = { status: 'pending', source_state: 'current', generation_id: 'generation-1', source_report_id: 'report-1' };
export const generated = {
  ...pending, status: 'generated', artifact_id: 'artifact-1',
  content: {
    schema_version: 'ai-explanation-output/v1', summary: '结合本次结果与日常情境理解。',
    integrated_insights: [{ kind: 'context_dependent_pattern', title: '结合情境阅读', content: '留意情境差异。', why_it_matters: '避免用一次表现概括全部。',
      evidence_refs: [{ kind: 'dimension', ref: 'dimension:a' }, { kind: 'dimension', ref: 'dimension:b' }] }],
    suggestions: [{ origin: 'generated_low_risk', category: 'daily_observation', title: '记录日常表现', goal: '理解具体情境', actions: ['记录当时环境。'],
      rationale: '便于回顾。', evidence_refs: [{ kind: 'dimension', ref: 'dimension:a' }], source_suggestion_refs: [], caution: '无需凭一次表现作结论。' }],
    limitations: ['仅基于本次测评，不构成诊断。'],
  },
};
export const failed = { ...pending, status: 'failed', failure: { code: 'provider_timeout', retryable: true, safe_message: '暂时未能完成解读。' } };
