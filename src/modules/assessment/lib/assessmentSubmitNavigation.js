import { routes } from '@/shared/config/routes';
import { ASSESSMENT_KIND } from '@/shared/lib/assessmentKind';

/**
 * 答卷提交成功后的导航目标（页面只负责 redirectTo）。
 */
export function buildPostSubmitRedirectUrl({
  questionnaireType,
  isPersonalityFlow,
  answersheetId,
  assessmentId,
  requestId,
  testeeId,
  planTaskId,
}) {
  if (questionnaireType === 'Survey') {
    return routes.assessmentResponse({
      a: answersheetId,
      task_id: planTaskId || undefined,
    });
  }

  if (questionnaireType === 'PersonalityAssessment' || isPersonalityFlow) {
    return routes.assessmentReportPending({
      a: answersheetId,
      aid: assessmentId || undefined,
      t: testeeId || undefined,
      kind: ASSESSMENT_KIND.PERSONALITY,
      request_id: requestId || undefined,
      task_id: planTaskId || undefined,
    });
  }

  if (questionnaireType === 'MedicalScale') {
    return routes.assessmentReportPending({
      a: answersheetId,
      aid: assessmentId || undefined,
      t: testeeId || undefined,
      request_id: requestId || undefined,
      task_id: planTaskId || undefined,
    });
  }

  return routes.assessmentResponse({
    a: answersheetId,
    task_id: planTaskId || undefined,
  });
}

export function resolvePostSubmitNavigationKind({
  questionnaireType,
  isPersonalityFlow,
}) {
  if (questionnaireType === 'Survey') {
    return 'survey_response';
  }
  if (questionnaireType === 'PersonalityAssessment' || isPersonalityFlow) {
    return 'personality_pending';
  }
  if (questionnaireType === 'MedicalScale') {
    return 'medical_pending';
  }
  return 'survey_response_fallback';
}
