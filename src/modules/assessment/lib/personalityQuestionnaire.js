/**
 * 将 personality-assessment-session ViewModel 转为问卷填写组件可用结构
 */
import {
  normalizePersonalitySession,
  normalizeQuestionnaire,
  normalizeSubmitContract,
} from '@/services/api/personality';

export { normalizePersonalitySession, normalizeSubmitContract };

export const prepareQuestionnaireFromSession = (sessionOrVm) => {
  const sessionVM = sessionOrVm?.submitContract
    ? sessionOrVm
    : normalizePersonalitySession(sessionOrVm);

  const questionnaire = normalizeQuestionnaire(sessionVM.questionnaire || {});
  const contract = sessionVM.submitContract || {};
  const model = sessionVM.model || {};

  questionnaire.code = contract.questionnaire_code || questionnaire.code || model.questionnaireCode;
  questionnaire.version = contract.questionnaire_version || questionnaire.version || model.questionnaireVersion;
  questionnaire.type = 'PersonalityAssessment';
  questionnaire.title = questionnaire.title || model.title || '';
  questionnaire.subtitle = questionnaire.subtitle || model.subtitle || '';
  questionnaire.introduction = questionnaire.introduction || model.description || questionnaire.description || '';
  questionnaire.thumbnail = questionnaire.thumbnail || model.thumbnail || '';

  let currentQuestionIndex = 1;
  questionnaire.questions = (questionnaire.questions || []).map((question) => {
    const next = { ...question };

    if (next.type === 'Section') {
      return next;
    }

    if (!String(next.title || '').match(/^\d+\.\s/)) {
      next.title = `${currentQuestionIndex}. ${next.title || ''}`;
    }
    currentQuestionIndex += 1;

    switch (next.type) {
      case 'CheckBox':
      case 'ImageCheckBox':
        next.value = [];
        break;
      default:
        next.value = '';
        break;
    }

    return next;
  });

  return questionnaire;
};

export const buildSubmitContractFromSession = (sessionOrVm) => {
  const sessionVM = sessionOrVm?.submitContract
    ? sessionOrVm
    : normalizePersonalitySession(sessionOrVm);
  return { ...sessionVM.submitContract };
};
