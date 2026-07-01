import { routes } from '@/shared/config/routes';
import { ASSESSMENT_KIND, isPersonalityAssessmentKind } from '@/shared/lib/assessmentKind';
import {
  getAssessmentReportStatus,
  waitAssessmentReport,
  isReportWaitCompleted,
  isReportWaitFailed,
} from '@/services/api/assessments';
import {
  getPersonalityReportStatus,
  waitPersonalityReport,
} from '@/services/api/personality';

const PERSONALITY_STAGE_TEXT = Object.freeze({
  pending: '正在排队',
  submitted: '已提交，正在分析',
  queued: '正在排队',
  processing: '处理中',
  scoring: '正在计分',
  interpreting: '正在生成解读',
  interpreted: '报告已生成',
  completed: '报告已生成',
  failed: '生成失败',
});

const MEDICAL_STAGE_TEXT = Object.freeze({
  queued: '排队中',
  processing: '处理中',
  scoring: '正在计分',
  interpreting: '正在解读',
  completed: '报告已生成',
  failed: '报告生成失败',
});

export function formatReportWaitStageMessage(kind, stage, fallbackMessage) {
  const stageKey = String(stage || '').toLowerCase();
  const textMap = isPersonalityAssessmentKind(kind) ? PERSONALITY_STAGE_TEXT : MEDICAL_STAGE_TEXT;
  const stageText = textMap[stageKey];
  return fallbackMessage || (stageText ? `${stageText}，请稍候...` : '正在解析测评报告，请稍候...');
}

export function createReportWaitStrategy(kind) {
  const isPersonality = isPersonalityAssessmentKind(kind);

  if (isPersonality) {
    return {
      kind: ASSESSMENT_KIND.PERSONALITY,
      pollReportStatus: ({ assessmentId, testeeId }) =>
        getPersonalityReportStatus({ assessmentId, testeeId }),
      waitReport: ({ assessmentId, testeeId, timeout }) =>
        waitPersonalityReport({ assessmentId, testeeId, timeout }),
      reportRoute: routes.personalityReport,
      completedStatuses: ['interpreted', 'completed'],
      isCompleted: (status) => isReportWaitCompleted(status),
      isFailed: (status) => isReportWaitFailed(status),
      formatStageMessage: (stage, fallbackMessage) =>
        formatReportWaitStageMessage(ASSESSMENT_KIND.PERSONALITY, stage, fallbackMessage),
    };
  }

  return {
    kind: ASSESSMENT_KIND.MEDICAL,
    pollReportStatus: ({ assessmentId, testeeId }) =>
      getAssessmentReportStatus(assessmentId, testeeId),
    waitReport: ({ assessmentId, testeeId, timeout }) =>
      waitAssessmentReport(assessmentId, testeeId, timeout),
    reportRoute: routes.assessmentReport,
    completedStatuses: ['completed', 'interpreted'],
    isCompleted: (status) => isReportWaitCompleted(status),
    isFailed: (status) => isReportWaitFailed(status),
    formatStageMessage: (stage, fallbackMessage) =>
      formatReportWaitStageMessage(ASSESSMENT_KIND.MEDICAL, stage, fallbackMessage),
  };
}
