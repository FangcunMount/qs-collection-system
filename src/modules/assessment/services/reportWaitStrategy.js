import { routes } from '@/shared/config/routes';
import {
  ASSESSMENT_KIND,
  isAbilityAssessmentKind,
  isPersonalityAssessmentKind,
} from '@/shared/lib/assessmentKind';
import {
  getAssessmentReportStatus,
  isReportWaitFailed,
} from '@/services/api/assessments';
import {
  getPersonalityReportStatus,
} from '@/services/api/personality';
import { isReportReadable } from '@/modules/assessment/lib/reportReadiness';

const PERSONALITY_STAGE_TEXT = Object.freeze({
  pending: '正在排队',
  submitted: '已提交，正在分析',
  queued: '正在排队',
  processing: '处理中',
  scoring: '正在计分',
  interpreting: '正在生成解读',
  interpreted: '报告已生成',
  failed: '生成失败',
});

const MEDICAL_STAGE_TEXT = Object.freeze({
  queued: '排队中',
  processing: '处理中',
  scoring: '正在计分',
  interpreting: '正在解读',
  interpreted: '报告已生成',
  failed: '报告生成失败',
});

const isInterpreted = isReportReadable;

export function formatReportWaitStageMessage(kind, stage, fallbackMessage) {
  const stageKey = String(stage || '').toLowerCase();
  const textMap = isPersonalityAssessmentKind(kind) ? PERSONALITY_STAGE_TEXT : MEDICAL_STAGE_TEXT;
  const stageText = textMap[stageKey];
  return fallbackMessage || (stageText ? `${stageText}，请稍候...` : '正在解析测评报告，请稍候...');
}

export function createReportWaitStrategy(kind) {
  const isPersonality = isPersonalityAssessmentKind(kind);
  const isAbility = isAbilityAssessmentKind(kind);

  if (isPersonality) {
    return {
      kind: ASSESSMENT_KIND.PERSONALITY,
      pollReportStatus: ({ assessmentId, testeeId }) =>
        getPersonalityReportStatus({ assessmentId, testeeId }),
      reportRoute: routes.personalityReport,
      completedStatuses: ['interpreted'],
      isCompleted: isInterpreted,
      isFailed: (status) => isReportWaitFailed(status),
      formatStageMessage: (stage, fallbackMessage) =>
        formatReportWaitStageMessage(ASSESSMENT_KIND.PERSONALITY, stage, fallbackMessage),
    };
  }

  // 行为能力与医学量表共用报告状态 / 报告页契约，但保留 ability kind 供等待页与记录分流。
  const resolvedKind = isAbility ? ASSESSMENT_KIND.ABILITY : ASSESSMENT_KIND.MEDICAL;
  return {
    kind: resolvedKind,
    pollReportStatus: ({ assessmentId, testeeId }) =>
      getAssessmentReportStatus(assessmentId, testeeId),
    reportRoute: routes.assessmentReport,
    completedStatuses: ['interpreted'],
    isCompleted: isInterpreted,
    isFailed: (status) => isReportWaitFailed(status),
    formatStageMessage: (stage, fallbackMessage) =>
      formatReportWaitStageMessage(resolvedKind, stage, fallbackMessage),
  };
}
