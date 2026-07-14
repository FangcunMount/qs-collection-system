import type {
  AssessmentResponseAnswer,
  AssessmentResponseQuestion,
} from "../types";

const MULTI_CHOICE_TYPES = new Set(["CheckBox", "ImageCheckBox"]);

const parseAnswerValue = (questionType: string, value = ""): unknown => {
  if (!MULTI_CHOICE_TYPES.has(questionType)) return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const mergeQuestionsWithAnswers = (
  questionList: AssessmentResponseQuestion[] = [],
  answerList: AssessmentResponseAnswer[] = [],
): AssessmentResponseQuestion[] => {
  const answerMap = new Map(answerList.map((answer) => [answer.question_code, answer]));
  let questionIndex = 1;

  return questionList.map((sourceQuestion) => {
    const question = { ...sourceQuestion };
    const answer = answerMap.get(question.code);
    if (question.type !== "Section") {
      question.title = `${questionIndex}. ${question.title}`;
      questionIndex += 1;
    }

    if (!answer || !answer.value) {
      question.value = MULTI_CHOICE_TYPES.has(question.type) ? [] : "";
      question.score = 0;
      return question;
    }

    const answerValue = parseAnswerValue(question.type, answer.value);
    question.value = answerValue;
    question.score = answer.score || 0;
    if (Array.isArray(question.options)) {
      question.options = question.options.map((option) => {
        const selected = Array.isArray(answerValue)
          ? answerValue.includes(option.code)
          : option.code === answerValue;
        return { ...option, is_select: selected ? "1" : "0" };
      });
    }
    return question;
  });
};
