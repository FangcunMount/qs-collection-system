export const ASSESSMENT_KIND = Object.freeze({
  PERSONALITY: 'personality',
  MEDICAL: 'medical',
});

export const isPersonalityAssessmentKind = (kind) => {
  return String(kind || '').toLowerCase() === ASSESSMENT_KIND.PERSONALITY;
};
