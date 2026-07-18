import { routes } from '@/shared/config/routes';
import {
  ASSESSMENT_KIND,
  normalizeAssessmentKind,
} from '@/shared/lib/assessmentKind';

/**
 * 解析答卷提交后的测评类型（人格 / 行为能力 / 医学 / 普通问卷）。
 */
export function resolveSubmitAssessmentKind({
  questionnaireType,
  assessmentKind,
  isPersonalityFlow,
} = {}) {
  const explicitKind = normalizeAssessmentKind(assessmentKind);
  if (explicitKind) return explicitKind;

  const typeKind = normalizeAssessmentKind(questionnaireType);
  if (typeKind) return typeKind;

  if (questionnaireType === 'PersonalityAssessment' || isPersonalityFlow) {
    return ASSESSMENT_KIND.PERSONALITY;
  }
  if (questionnaireType === 'MedicalScale') {
    return ASSESSMENT_KIND.MEDICAL;
  }
  if (questionnaireType === 'Survey') {
    return '';
  }
  return '';
}

/**
 * 答卷提交成功后的导航目标（页面只负责 redirectTo）。
 *
 * HTTP 202 必须直接包含可靠持久化的 answersheet_id。
 * 测评类带着 answersheet_id 进入等待页，通过 readiness 获取 assessment_id；普通 Survey 进入答卷详情。
 */
export function buildPostSubmitRedirectUrl({
  questionnaireType,
  isPersonalityFlow,
  assessmentKind,
  answersheetId,
  assessmentId,
  requestId,
  testeeId,
  planTaskId,
}) {
  const kind = resolveSubmitAssessmentKind({
    questionnaireType,
    assessmentKind,
    isPersonalityFlow,
  });

  if (kind === ASSESSMENT_KIND.PERSONALITY) {
    return routes.assessmentReportPending({
      a: answersheetId,
      aid: assessmentId || undefined,
      t: testeeId || undefined,
      kind: ASSESSMENT_KIND.PERSONALITY,
      request_id: requestId || undefined,
      task_id: planTaskId || undefined,
    });
  }

  if (kind === ASSESSMENT_KIND.ABILITY) {
    return routes.assessmentReportPending({
      a: answersheetId,
      aid: assessmentId || undefined,
      t: testeeId || undefined,
      kind: ASSESSMENT_KIND.ABILITY,
      request_id: requestId || undefined,
      task_id: planTaskId || undefined,
    });
  }

  if (kind === ASSESSMENT_KIND.MEDICAL || questionnaireType === 'MedicalScale') {
    return routes.assessmentReportPending({
      a: answersheetId,
      aid: assessmentId || undefined,
      t: testeeId || undefined,
      request_id: requestId || undefined,
      task_id: planTaskId || undefined,
    });
  }

  // Survey 或无法识别的问卷类型：答卷详情
  return routes.assessmentResponse({
    a: answersheetId,
    task_id: planTaskId || undefined,
  });
}

export function resolvePostSubmitNavigationKind({
  questionnaireType,
  isPersonalityFlow,
  assessmentKind,
} = {}) {
  const kind = resolveSubmitAssessmentKind({
    questionnaireType,
    assessmentKind,
    isPersonalityFlow,
  });

  if (kind === ASSESSMENT_KIND.PERSONALITY) return 'personality_pending';
  if (kind === ASSESSMENT_KIND.ABILITY) return 'ability_pending';
  if (kind === ASSESSMENT_KIND.MEDICAL || questionnaireType === 'MedicalScale') {
    return 'medical_pending';
  }
  if (questionnaireType === 'Survey') return 'survey_response';
  return 'survey_response_fallback';
}

/**
 * 报告页共用路由通过 kind 区分医学与行为能力报告。
 * 医学报告沿用无 kind 的历史链接；其他专用报告必须保留规范类型。
 */
export function resolveReportRedirectKind(assessmentKind) {
  const kind = normalizeAssessmentKind(assessmentKind);
  if (!kind || kind === ASSESSMENT_KIND.MEDICAL) return undefined;
  return kind;
}
