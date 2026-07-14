import React, { useState, useEffect, useRef } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import PageShell from "@/shared/ui/PageShell";

import QuestionRenderer from "./QuestionRenderer";
import QuestionnaireBottomActions from "./QuestionnaireBottomActions";

import "./QuestionnaireForm.less";

import SelectWriterRole from "./selectWriterRole";

import { getQuestionnaire } from "@/services/api/questionnaires";
import { submitQuestionnaire } from "@/services/api/assessmentSubmissions";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { getLogger } from "@/shared/lib/logger";
import {
  buildQuestionnaireSubmission,
  hasAnyVisibleAnswer,
  isQuestionVisible,
  SUBMIT_NO_ANSWER_MESSAGE,
  validateQuestion,
} from "../lib/questionnaireFlow";
import type {
  QuestionnaireControllerProps,
  QuestionnaireData,
  QuestionnaireQuestion,
  QuestionnaireSubmitResult,
  ShowController,
  WriterRoleOption,
} from "../types";

const PAGE_NAME = "questionnaire_form";
const logger = getLogger(PAGE_NAME);

interface SubmissionError {
  submissionAttempt?: unknown;
}

type UseSubmitHook = (config: {
  beforeSubmit?: () => boolean;
  submit: () => Promise<void>;
  options?: { needGobalLoading?: boolean; gobalLoadingTips?: string };
}) => [boolean, () => Promise<boolean>];

const useTypedSubmit = useSubmit as unknown as UseSubmitHook;

export function checkQuestion(question: QuestionnaireQuestion, index?: number): boolean {
  const result = validateQuestion(question, index);
  if (!result.valid && result.message) {
    Taro.showToast({ title: result.message, icon: "none" });
  }
  return result.valid;
}

export default function QuestionnaireForm({
  canSubmit,
  questionnaireCode,
  initialQuestionnaire,
  submitContract,
  subSignid,
  writedCallback
}: QuestionnaireControllerProps) {
  const [questionSheet, setQuestionSheet] = useState<QuestionnaireData | null>(null);
  const [writerRoles, setWriterRoles] = useState<WriterRoleOption[]>([]);
  const [writerRoleCode, setWriterRoleCode] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(-1);
  const submissionAttemptRef = useRef<unknown>(null);

  const applyQuestionnaire = (result: QuestionnaireData): void => {
    logger.RUN('[QuestionnaireForm] 问卷数据加载成功:', {
      code: result?.code,
      title: result?.title,
      questionsCount: result?.questions?.length,
      hasQuestions: !!result?.questions
    });

    setQuestionSheet(result);

    if (result.writer_roles && result.writer_roles.length > 0) {
      setWriterRoles(
        result.writer_roles.map((v) => ({
          label: v.name,
          value: v.code
        }))
      );
    }
  };

  useEffect(() => {
    if (initialQuestionnaire) {
      applyQuestionnaire(initialQuestionnaire);
      return;
    }

    if (questionnaireCode) {
      initQuestionnaire(questionnaireCode);
    }
  }, [questionnaireCode, initialQuestionnaire]);

  /**
   * @description 初始化问卷
   * @param questionnaireCode 问卷 code
   */
  const initQuestionnaire = (id: string): void => {
    Taro.showLoading();
    setQuestionSheet(null);
    setWriterRoles([]);
    setWriterRoleCode(null);

    getQuestionnaire(id).then((result: unknown) => {
      applyQuestionnaire(result as QuestionnaireData);
      Taro.hideLoading();
    }).catch(error => {
      console.error('加载问卷失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载问卷失败', icon: 'none' });
    });
  };

  /**
   * @description Get whether the current question is displayed
   * @param {object} showController The show and hidden controller for the current question
   * @returns {boolean} Is the question displayed?
   */

  const getQuestionIsShow = (showController?: ShowController | "" | null): boolean => {
    return !questionSheet?.questions
      || isQuestionVisible(questionSheet.questions, showController);
  };

  /**
   * @description get question component
   * @param {object} v question object
   * @param {number} i current question index
   * @returns {JSX.Element}
   */
  const updateQuestionValue = (questionCode: string, value: unknown): void => {
    setQuestionSheet(current => ({
      ...(current as QuestionnaireData),
      questions: (current?.questions ?? []).map((question) => (
        question.code === questionCode ? { ...question, value } : question
      )),
    }));
  };

  const updateQuestionExtend = (questionCode: string, optionIndex: number, value: unknown): void => {
    setQuestionSheet(current => ({
      ...(current as QuestionnaireData),
      questions: (current?.questions ?? []).map((question) => {
        if (question.code !== questionCode) return question;
        const options = (question.options || []).map((option, index) => (
          index === optionIndex ? { ...option, extend_content: value } : option
        ));
        return { ...question, options };
      }),
    }));
  };

  /**
   * @description Verify all questions
   * @param {object} questions questions list
   * @returns {boolean} Did the verification succeed?
   */
  const verifyQuestions = (questions: QuestionnaireQuestion[]): boolean => {
    for (let index = 0; index < questions.length; index++) {
      const element = questions[index];
      if (!getQuestionIsShow(element.show_controller)) {
        continue;
      }

      if (!verifyQuestion(element, index)) {
        return false;
      }
    }
    return true;
  };

  /**
   * @description: Verify a question
   * @param {question} q: question
   * @param {number} i: current question's index
   * @returns {boolean} : Did the verification succeed?
   */
  const verifyQuestion = (q: QuestionnaireQuestion, i: number): boolean => {
    let result = true;

    if (!checkQuestion(q, i)) {
      result = false;
    }

    // 校验未通过，需要跳转到问题所在位置
    if (!result) gotoVerifyFailQuestion(i);

    return result;
  };

  const gotoVerifyFailQuestion = (i: number): void => {
    const query = Taro.createSelectorQuery();
    query
      .select(`#question-${i}`)
      .boundingClientRect()
      .select(".questionnaire-form-shell .page-shell__content")
      .scrollOffset()
      .exec((res) => {
        if (!res?.[0] || !res?.[1]) return;
        // 连续变更两次是因为避免同一题多次验证失败无法跳转
        setScrollTop(res[0].top + res[1].scrollTop - 100);
        setScrollTop(res[0].top + res[1].scrollTop - 101);
      });
  };

  // 数据清洗
  const [subBtnLoading, handleSubmit] = useTypedSubmit({
    beforeSubmit: () => {
      if (!questionSheet) return false;
      if (writerRoles.length > 0 && !writerRoleCode) {
        Taro.showToast({ title: `请选择填写人`, icon: "none" });
        return false;
      }
      if (!hasAnyVisibleAnswer(questionSheet.questions)) {
        Taro.showToast({ title: SUBMIT_NO_ANSWER_MESSAGE, icon: "none" });
        return false;
      }
      if (!verifyQuestions(questionSheet.questions)) {
        return false;
      }

      return true;
    },
    submit: async () => {
      if (!questionSheet) return;
      const submitData = buildQuestionnaireSubmission(questionSheet, submitContract);

      logger.RUN("handleSubmitQuestionnaire <RUN>, params: ", {
        writerRoleCode,
        subSignid
      });

      let res;
      try {
        res = await submitQuestionnaire(
          submitData,
          writerRoleCode,
          subSignid,
          {
            onQueued: ({ requestId }: { requestId: string }) => {
              logger.WARN('[QuestionnaireForm] 提交已进入队列', {
                requestId,
                questionnaireCode: submitData.code
              });
              Taro.showLoading({
                title: '排队处理中',
                mask: true
              });
            },
            onQueueCompleted: ({ requestId, statusResult }: {
              requestId: string;
              statusResult?: { answersheet_id?: string };
            }) => {
              logger.RUN('[QuestionnaireForm] 队列处理完成', {
                requestId,
                answersheetId: statusResult?.answersheet_id ?? null
              });
            }
          },
          { submitContract, submissionAttempt: submissionAttemptRef.current }
        );
      } catch (error: unknown) {
        submissionAttemptRef.current = (error as SubmissionError)?.submissionAttempt || submissionAttemptRef.current;
        throw error;
      }
      submissionAttemptRef.current = res.submission_attempt || submissionAttemptRef.current;
      logger.RUN('[QuestionnaireForm] 提交完成', {
        answersheetId: res.id,
        submitMode: res.submit_mode,
        queued: res.queued
      });
      const submitResult = res as QuestionnaireSubmitResult;
      if (submitResult.id || submitResult.request_id) {
        Taro.showToast({ title: "提交成功", icon: "success", mask: true });
        await writedCallback(
          submitResult.id || '',
          submitResult.assessment_id || '',
          submitResult.request_id || '',
          submitResult
        );
      }
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "提交中..."
    }
  });

  return (
    <PageShell
      tone={questionSheet?.type === "PersonalityAssessment" ? "personality" : "medical"}
      className="questionnaire-form-shell"
      contentClassName="questionnaire-form-scroll"
      scrollTop={scrollTop}
      fixedAction={canSubmit ? (
        <QuestionnaireBottomActions
          tone={questionSheet?.type === "PersonalityAssessment" ? "personality" : "medical"}
          showSubmit
          submitting={subBtnLoading}
          onSubmit={handleSubmit}
        />
      ) : null}
    >
      <View className="questionnaire-fill-wrapper">
        <View className="qs-header__container">
          <Text className="qs-header__eyebrow">测评问卷</Text>
          <Text className="qs-header__title">{questionSheet?.title}</Text>
        </View>

        {writerRoles.length > 0 ? (
          <SelectWriterRole
            roles={writerRoles}
            roleCode={writerRoleCode}
            changeRoleCode={setWriterRoleCode}
          />
        ) : null}

        {questionSheet && questionSheet.questions
          ? questionSheet.questions.map((v, i) => {
              if (!getQuestionIsShow(v.show_controller)) {
                return null;
              }
              // 计算实际题号（排除 Section 类型）
              const questionNumber = questionSheet.questions
                .slice(0, i)
                .filter((question) => question.type !== "Section" && getQuestionIsShow(question.show_controller))
                .length;
              
              return (
                <View
                  key={v.code}
                  className="qs-question__container"
                  id={`question-${i}`}
                >
                  <QuestionRenderer
                    question={v}
                    index={v.type === 'Section' ? undefined : questionNumber}
                    onChangeValue={(value) => updateQuestionValue(v.code, value)}
                    onChangeExtend={(optionIndex, value) => updateQuestionExtend(v.code, optionIndex, value)}
                  />
                </View>
              );
            })
          : null}
      </View>
    </PageShell>
  );
}
