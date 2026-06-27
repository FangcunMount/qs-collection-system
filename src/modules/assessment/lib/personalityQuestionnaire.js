/**
 * 将 personality-assessment-session 响应转为问卷填写组件可用结构
 */
export const prepareQuestionnaireFromSession = (session) => {
  const questionnaire = { ...(session?.questionnaire || {}) };
  const contract = session?.submit_contract || {};
  const model = session?.model || {};

  questionnaire.code = contract.questionnaire_code || questionnaire.code || model.questionnaire_code;
  questionnaire.version = contract.questionnaire_version || questionnaire.version || model.questionnaire_version;
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

export const buildSubmitContractFromSession = (session) => {
  const contract = session?.submit_contract || {};
  return {
    questionnaire_code: contract.questionnaire_code,
    questionnaire_version: contract.questionnaire_version,
    testee_id: contract.testee_id
  };
};
