import { ASSESSMENT_KIND } from '@/shared/lib/assessmentKind';

/**
 * 统一测评入口 URL 参数
 * 兼容旧参数 mc/t 与新参数 model_code/testee_id/kind
 */
export function normalizeAssessmentEntryParams(params = {}) {
  const modelCode = params.model_code || params.mc || '';
  const testeeId = params.testee_id || params.t || '';
  const questionnaireCode = params.questionnaire_code || params.q || '';
  const explicitKind = params.kind || '';

  let kind = explicitKind;
  if (!kind && modelCode) {
    kind = ASSESSMENT_KIND.PERSONALITY;
  }

  return {
    kind,
    modelCode: modelCode ? String(modelCode) : '',
    questionnaireCode: questionnaireCode ? String(questionnaireCode) : '',
    testeeId: testeeId ? String(testeeId) : '',
    startImmediately: String(params.start || '') === '1',
    singlePage: String(params.sp || '') === '1',
    signid: params.signid || '',
    taskId: params.task_id || '',
    token: params.token || '',
    scene: params.scene || '',
    raw: params,
  };
}
