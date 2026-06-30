import { ABILITY_SPECIALIZED_ASSESSMENTS } from "@/shared/config/abilityAssessments";

export const ASSESSMENT_KIND = Object.freeze({
  PERSONALITY: 'personality',
  MEDICAL: 'medical',
  ABILITY: 'ability',
});

const ABILITY_CODES = new Set(
  ABILITY_SPECIALIZED_ASSESSMENTS
    .map((item) => item.scaleCode)
    .filter(Boolean)
    .map((code) => String(code).toUpperCase())
);

const PERSONALITY_KIND_ALIASES = Object.freeze([
  'personality',
  'personality_assessment',
  'personalityassessment',
]);

const ABILITY_KIND_ALIASES = Object.freeze([
  'ability',
  'ability_assessment',
  'abilityassessment',
  'behavior',
  'behavior_ability',
  'behaviorability',
  'behavior_assessment',
  'behaviorassessment',
]);

const MEDICAL_KIND_ALIASES = Object.freeze([
  'medical',
  'medical_scale',
  'medicalscale',
  'scale',
]);

export const normalizeAssessmentKind = (kind) => {
  const value = String(kind || '').trim().toLowerCase();
  if (!value) return '';

  if (PERSONALITY_KIND_ALIASES.includes(value)) {
    return ASSESSMENT_KIND.PERSONALITY;
  }

  if (ABILITY_KIND_ALIASES.includes(value)) {
    return ASSESSMENT_KIND.ABILITY;
  }

  if (MEDICAL_KIND_ALIASES.includes(value)) {
    return ASSESSMENT_KIND.MEDICAL;
  }

  return '';
};

export const resolveAssessmentKind = (assessment = {}) => {
  const explicitKind = normalizeAssessmentKind(
    assessment.assessment_kind ||
      assessment.assessmentKind ||
      assessment.kind ||
      assessment.category ||
      assessment.questionnaire_type ||
      assessment.questionnaireType ||
      assessment.type ||
      assessment.origin_type ||
      assessment.originType
  );

  if (explicitKind) {
    return explicitKind;
  }

  if (assessment.model_extra || assessment.modelExtra) {
    return ASSESSMENT_KIND.PERSONALITY;
  }

  const modelCode = String(
    assessment.model_code || assessment.modelCode || ''
  ).toUpperCase();
  const scaleCode = String(
    assessment.scale_code || assessment.scaleCode || ''
  ).toUpperCase();

  // 人格测评走 model_code，医学量表走 scale_code（后端契约区分）
  if (modelCode && !scaleCode) {
    if (ABILITY_CODES.has(modelCode)) {
      return ASSESSMENT_KIND.ABILITY;
    }
    return ASSESSMENT_KIND.PERSONALITY;
  }

  const code = String(
    assessment.questionnaire_code ||
      assessment.questionnaireCode ||
      scaleCode ||
      ''
  ).toUpperCase();

  if (ABILITY_CODES.has(code)) {
    return ASSESSMENT_KIND.ABILITY;
  }

  return ASSESSMENT_KIND.MEDICAL;
};

export const isPersonalityAssessmentKind = (kind) => {
  return normalizeAssessmentKind(kind) === ASSESSMENT_KIND.PERSONALITY;
};

export const isAbilityAssessmentKind = (kind) => {
  return normalizeAssessmentKind(kind) === ASSESSMENT_KIND.ABILITY;
};

export const isMedicalAssessmentKind = (kind) => {
  return normalizeAssessmentKind(kind) === ASSESSMENT_KIND.MEDICAL;
};

export const matchesAssessmentKindFilter = (assessment = {}, kind = '') => {
  const normalizedKind = normalizeAssessmentKind(kind);
  if (!normalizedKind) {
    return true;
  }
  return resolveAssessmentKind(assessment) === normalizedKind;
};
