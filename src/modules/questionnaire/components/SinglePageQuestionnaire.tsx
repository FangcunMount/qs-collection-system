import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { getQuestionnaire } from "@/services/api/questionnaires";
import { submitQuestionnaire } from "@/services/api/assessmentSubmissions";
import "./SinglePageQuestionnaire.less";

import QuestionRenderer from "./QuestionRenderer";
import QuestionnaireBottomActions from "./QuestionnaireBottomActions";
import QuestionnaireProgress from "./QuestionnaireProgress";
import WriterRoleDialog from "./WriterRoleDialog";
import {
  buildQuestionnaireSubmission,
  getQuestionnaireProgress,
  hasAnyVisibleAnswer,
  isQuestionVisible,
  SUBMIT_NO_ANSWER_MESSAGE,
  validateQuestion,
} from "../lib/questionnaireFlow";
import { useThrottle } from "@/shared/hooks/useThrottle";
import { getLogger } from "@/shared/lib/logger";
import type {
  QuestionnaireControllerProps,
  QuestionnaireData,
  QuestionnaireSubmitResult,
  QuestionnaireVariant,
  ShowController,
  WriterRoleOption,
} from "../types";

const PAGE_NAME = "single_page_questionnaire";
const logger = getLogger(PAGE_NAME);

interface SinglePageQuestionnaireProps extends QuestionnaireControllerProps {
  variant?: QuestionnaireVariant;
}

interface SubmissionError {
  submissionAttempt?: unknown;
  errmsg?: unknown;
  message?: unknown;
}

export default function SinglePageQuestionnaire(props: SinglePageQuestionnaireProps) {
  const {
    questionnaireCode,
    initialQuestionnaire,
    submitContract,
    subSignid,
    writedCallback,
    canSubmit,
    variant = "default"
  } = props;

  const [questionSheet, setQuestionSheet] = useState<QuestionnaireData | null>(null);
  const [curQuestionIndex, setCurQuestionIndex] = useState(-1);

  const [writerRoles, setWriterRoles] = useState<WriterRoleOption[]>([]);
  const [writerRoleCode, setWriterRoleCode] = useState<string | null>(null);
  const [needWriterRole, setNeedWriterRole] = useState(false);
  const submissionAttemptRef = useRef<unknown>(null);

  const applyQuestionnaire = (result: QuestionnaireData): void => {
    const questionnaire = result.questionnaire || result;
    setQuestionSheet({
      ...questionnaire,
      questions: questionnaire.questions.filter((question) => question.type !== "Section"),
    });
    setCurQuestionIndex(0);

    if (result.writer_roles && result.writer_roles.length > 0) {
      setWriterRoles(
        result.writer_roles.map((v) => ({
          label: v.name,
          value: v.code
        }))
      );
      setNeedWriterRole(true);
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
   * @description step number(because need skip some questions)
   * @param {"next" | "prev"} prevOrNext
   */
  const getStepNum = (prevOrNext: "next" | "prev" = "next"): number => {
    if (!questionSheet) return 1;
    let stepNum = 1;
    while (true) {
      let qi: number;
      if (prevOrNext === "next") {
        qi = curQuestionIndex + stepNum;
      } else {
        qi = curQuestionIndex - stepNum;
      }
      const curQ = questionSheet.questions[qi];
      if (!curQ) break;
      const isShow = getQuestionIsShow(curQ.show_controller);
      if (isShow) break;
      stepNum++;
    }

    return stepNum;
  };

  /**
   * @description go to prev question
   */
  const handleToPrevQuestion = () => {
    setCurQuestionIndex(curQuestionIndex - getStepNum("prev"));
  };

  /**
   * @description go to next question
   */
  const handleToNextQuestion = () => {
    if (!questionSheet) return;
    const result = validateQuestion(questionSheet.questions[curQuestionIndex], curQuestionIndex);
    if (!result.valid) {
      Taro.showToast({ title: result.message || "请检查当前题目", icon: "none" });
      return;
    }

    setCurQuestionIndex(curQuestionIndex + getStepNum("next"));
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

  const handleSubmit = useThrottle(() => {
    if (!questionSheet) return;
    if (writerRoles.length > 0 && !writerRoleCode) {
      Taro.showToast({
        title: `请选择填写人`,
        icon: "none"
      });
      setNeedWriterRole(true);
      return;
    }

    if (!hasAnyVisibleAnswer(questionSheet.questions)) {
      Taro.showToast({
        title: SUBMIT_NO_ANSWER_MESSAGE,
        icon: "none"
      });
      return;
    }

    const submitData = buildQuestionnaireSubmission(questionSheet, submitContract);

    Taro.showLoading({
      title: "提交中...",
      mask: true
    });

    submitQuestionnaire(submitData, writerRoleCode, subSignid, {
      onQueued: ({ requestId }: { requestId: string }) => {
        logger.WARN('[SinglePageQuestionnaire] 提交已进入队列', {
          requestId,
          questionnaireCode: submitData.code
        });
        Taro.showLoading({
          title: "排队处理中",
          mask: true
        });
      },
      onQueueCompleted: ({ requestId, statusResult }: {
        requestId: string;
        statusResult?: { answersheet_id?: string };
      }) => {
        logger.RUN('[SinglePageQuestionnaire] 队列处理完成', {
          requestId,
          answersheetId: statusResult?.answersheet_id ?? null
        });
      }
    }, { submitContract, submissionAttempt: submissionAttemptRef.current })
      .then(async (result: QuestionnaireSubmitResult) => {
        submissionAttemptRef.current = result.submission_attempt || submissionAttemptRef.current;
        Taro.hideLoading();
        logger.RUN('[SinglePageQuestionnaire] 提交完成', {
          answersheetId: result.id,
          submitMode: result.submit_mode,
          queued: result.queued
        });
        Taro.showToast({ title: "提交成功", icon: "success" });
        // 传递答卷 ID 和测评 ID（如果有）给回调函数
        await writedCallback(
          result.id || '',
          result.assessment_id || '',
          result.request_id || '',
          result
        );
      })
      .catch((error: unknown) => {
        const err = error as SubmissionError;
        submissionAttemptRef.current = err.submissionAttempt || submissionAttemptRef.current;
        Taro.hideLoading();
        Taro.showToast({ title: String(err?.errmsg ?? err?.message ?? '提交失败'), icon: "none" });
      });
  }, 1000);

  const getQuestionContent = () => {
    if (!questionSheet) return null;

    const isPersonality = variant === "personality";

    if (curQuestionIndex >= questionSheet?.questions.length) {
      return (
        <View className='completion-container'>
          <View className='completion-content'>
            <View className='completion-icon'>✓</View>
            <Text className='completion-title'>所有题目已完成</Text>
            <Text className='completion-subtitle'>感谢您认真填写</Text>
          </View>
          <QuestionnaireBottomActions
            tone={isPersonality ? "personality" : "medical"}
            showPrevious
            previousLabel="返回修改"
            showSubmit={canSubmit}
            onPrevious={handleToPrevQuestion}
            onSubmit={handleSubmit}
          />
        </View>
      );
    }

    const currentQuestion = questionSheet.questions[curQuestionIndex];
    const progress = getQuestionnaireProgress(questionSheet.questions, currentQuestion.code);

    return (
      <>
        <View className='question-card__panel'>
          {isPersonality ? (
            <View className='questionnaire-single-page__hero'>
              <View className='questionnaire-single-page__cloud questionnaire-single-page__cloud--left'>
                <View className='questionnaire-single-page__eyes'>
                  <Text className='questionnaire-single-page__eye'></Text>
                  <Text className='questionnaire-single-page__eye'></Text>
                </View>
              </View>
              <View className='questionnaire-single-page__headline'>
                <Text className='questionnaire-single-page__headline-main'>测测你的</Text>
                <Text className='questionnaire-single-page__headline-tag'>人格类型</Text>
              </View>
              <View className='questionnaire-single-page__cloud questionnaire-single-page__cloud--right'>
                <View className='questionnaire-single-page__eyes'>
                  <Text className='questionnaire-single-page__eye'></Text>
                  <Text className='questionnaire-single-page__eye'></Text>
                </View>
              </View>
            </View>
          ) : null}

          <View className='question-card__body'>
            <QuestionnaireProgress {...progress} />

            <ScrollView scrollY className="question-scroll" enhanced showScrollbar={false}>
              <View className='question'>
                <QuestionRenderer
                  question={currentQuestion}
                  index={progress.current - 1}
                  onChangeValue={(value) => updateQuestionValue(currentQuestion.code, value)}
                  onChangeExtend={(optionIndex, value) => updateQuestionExtend(currentQuestion.code, optionIndex, value)}
                />
              </View>
            </ScrollView>
          </View>
        </View>

        <QuestionnaireBottomActions
          tone={isPersonality ? "personality" : "medical"}
          showPrevious
          showNext
          previousDisabled={curQuestionIndex <= 0}
          onPrevious={handleToPrevQuestion}
          onNext={handleToNextQuestion}
        />
      </>
    );
}

  return (
    <View className={`questionnaire-single-page questionnaire-single-page--${variant}`}>
      <WriterRoleDialog
        flag={needWriterRole}
        closeDialog={() => setNeedWriterRole(false)}
        writerRoles={writerRoles}
        writerRoleCode={writerRoleCode}
        setWriterRoleCode={setWriterRoleCode}
      ></WriterRoleDialog>

      <View className='question-card'>{getQuestionContent()}</View>
    </View>
  );
};
