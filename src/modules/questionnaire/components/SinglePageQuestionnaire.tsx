import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { getQuestionnaire } from "@/services/api/questionnaires";
import { submitQuestionnaire } from "@/services/api/assessmentSubmissions";
import "./SinglePageQuestionnaire.less";

import { useNetworkConnection } from "../hooks/useNetworkConnection";
import { getSessionRevision } from "@/shared/stores/sessionPrivacy";
import StatePanel from "@/shared/ui/StatePanel";
import QuestionRenderer from "./QuestionRenderer";
import QuestionnaireBottomActions from "./QuestionnaireBottomActions";
import QuestionnaireProgress from "./QuestionnaireProgress";
import WriterRoleDialog from "./WriterRoleDialog";
import {
  buildQuestionnaireSubmission,
  getAdjacentVisibleStep,
  getQuestionnaireProgress,
  getVisibleAnswerQuestions,
  getVisibleAnsweredQuestions,
  hasAnyVisibleAnswer,
  shouldAutoAdvanceOnSelect,
  SUBMIT_NO_ANSWER_MESSAGE,
  validateQuestion,
} from "../lib/questionnaireFlow";
import { getLogger } from "@/shared/lib/logger";
import type {
  QuestionnaireControllerProps,
  QuestionnaireData,
  QuestionnaireSubmitResult,
  QuestionnaireVariant,
  WriterRoleOption,
} from "../types";

const PAGE_NAME = "single_page_questionnaire";
const AUTO_ADVANCE_DELAY_MS = 250;
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
  const connected = useNetworkConnection();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);
  const submissionAttemptRef = useRef<unknown>(null);
  const mountedRef = useRef(true);
  const questionLoadRevision = useRef(0);
  const [loadError, setLoadError] = useState("");
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvanceTimer = (): void => {
    if (!autoAdvanceTimerRef.current) return;
    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; questionLoadRevision.current += 1; clearAutoAdvanceTimer(); };
  }, []);

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
    questionLoadRevision.current += 1;
    setLoadError("");
    setSubmitError("");
    clearAutoAdvanceTimer();
    setNeedWriterRole(false);
    submissionAttemptRef.current = null;
    setWriterRoles([]);
    setWriterRoleCode(null);
    if (initialQuestionnaire) {
      applyQuestionnaire(initialQuestionnaire);
      return;
    }

    if (questionnaireCode) {
      initQuestionnaire(questionnaireCode);
    }
  }, [questionnaireCode, initialQuestionnaire]);

  const initQuestionnaire = (id: string): void => {
    const revision = ++questionLoadRevision.current;
    setQuestionSheet(null);
    setLoadError("");
    setWriterRoles([]);
    setWriterRoleCode(null);
    void getQuestionnaire(id).then((result: unknown) => {
      if (!mountedRef.current || revision !== questionLoadRevision.current) return;
      applyQuestionnaire(result as QuestionnaireData);
    }).catch(() => {
      if (!mountedRef.current || revision !== questionLoadRevision.current) return;
      setLoadError("问卷暂时无法加载，请检查网络后重试。");
    });
  };

  /**
   * @description step number(because need skip some questions)
   * @param {"next" | "prev"} prevOrNext
   */
  const getStepNum = (prevOrNext: "next" | "prev" = "next"): number => {
    if (!questionSheet) return 1;
    return getAdjacentVisibleStep(questionSheet.questions, curQuestionIndex, prevOrNext);
  };

  /**
   * @description go to prev question
   */
  const handleToPrevQuestion = () => {
    clearAutoAdvanceTimer();
    setCurQuestionIndex(curQuestionIndex - getStepNum("prev"));
  };

  /**
   * @description go to next question
   */
  const handleToNextQuestion = () => {
    if (!questionSheet) return;
    clearAutoAdvanceTimer();
    const result = validateQuestion(questionSheet.questions[curQuestionIndex], curQuestionIndex);
    if (!result.valid) {
      Taro.showToast({ title: result.message || "请检查当前题目", icon: "none" });
      return;
    }

    setCurQuestionIndex(curQuestionIndex + getStepNum("next"));
  };

  const scheduleAutoAdvance = (
    questionIndex: number,
    updatedQuestions: QuestionnaireData["questions"],
  ): void => {
    clearAutoAdvanceTimer();
    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      setCurQuestionIndex((currentIndex) => {
        if (currentIndex !== questionIndex) return currentIndex;
        return currentIndex + getAdjacentVisibleStep(updatedQuestions, currentIndex, "next");
      });
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const updateQuestionValue = (questionCode: string, value: unknown): void => {
    if (!questionSheet) return;

    const questionIndex = curQuestionIndex;
    const currentQuestion = questionSheet.questions[questionIndex];
    if (!currentQuestion || currentQuestion.code !== questionCode) return;

    const updatedQuestion = { ...currentQuestion, value };
    const updatedQuestions = questionSheet.questions.map((question) => (
      question.code === questionCode ? updatedQuestion : question
    ));

    setQuestionSheet({
      ...questionSheet,
      questions: updatedQuestions,
    });

    if (!shouldAutoAdvanceOnSelect(updatedQuestion, value)) return;

    const validation = validateQuestion(updatedQuestion, questionIndex);
    if (!validation.valid) return;

    scheduleAutoAdvance(questionIndex, updatedQuestions);
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

  const handleSubmit = async () => {
    if (!mountedRef.current || !questionSheet || !canSubmit || submittingRef.current) return;
    clearAutoAdvanceTimer();
    if (writerRoles.length > 0 && !writerRoleCode) {
      Taro.showToast({ title: "请选择填写人", icon: "none" });
      setNeedWriterRole(true);
      return;
    }
    if (!hasAnyVisibleAnswer(questionSheet.questions)) {
      Taro.showToast({ title: SUBMIT_NO_ANSWER_MESSAGE, icon: "none" });
      return;
    }
    const visible = getVisibleAnswerQuestions(questionSheet.questions);
    const invalid = visible.find((question, index) => !validateQuestion(question, index).valid);
    if (invalid) {
      setCurQuestionIndex(questionSheet.questions.indexOf(invalid));
      Taro.showToast({ title: validateQuestion(invalid, visible.indexOf(invalid)).message || "请检查答题内容", icon: "none" });
      return;
    }
    const sessionRevision = getSessionRevision();
    const questionnaireRevision = questionLoadRevision.current;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    const submitData = buildQuestionnaireSubmission(questionSheet, submitContract);
    try {
      const result = await submitQuestionnaire(submitData, writerRoleCode, subSignid, {}, { submitContract, submissionAttempt: submissionAttemptRef.current }) as QuestionnaireSubmitResult;
      if (!mountedRef.current || sessionRevision !== getSessionRevision() || questionnaireRevision !== questionLoadRevision.current) return;
      submissionAttemptRef.current = result?.submission_attempt || submissionAttemptRef.current;
      if (!result?.id && !result?.request_id) throw new Error("暂未收到提交确认，请重试。");
      logger.RUN('[SinglePageQuestionnaire] 提交完成', { answersheetId: result.id, submitMode: result.submit_mode, status: result.status });
      await writedCallback(result.id || '', result.assessment_id || '', result.request_id || '', result);
    } catch (error: unknown) {
      if (!mountedRef.current || sessionRevision !== getSessionRevision() || questionnaireRevision !== questionLoadRevision.current) return;
      const err = error as SubmissionError;
      submissionAttemptRef.current = err?.submissionAttempt || submissionAttemptRef.current;
      setSubmitError("提交结果暂未确认，答案仍在当前页面。请根据提示处理后重试。");
      Taro.showToast({ title: String(err?.errmsg ?? err?.message ?? '提交未完成'), icon: "none" });
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const getQuestionContent = () => {
    if (!questionSheet) return <StatePanel state={loadError ? "error" : "loading"} title={loadError ? "问卷加载失败" : "正在加载问卷"} description={loadError || undefined} actionText={loadError ? "重新加载" : undefined} onAction={loadError && questionnaireCode ? () => initQuestionnaire(questionnaireCode) : undefined} />;

    const isPersonality = variant === "personality";

    if (curQuestionIndex >= questionSheet?.questions.length) {
      return (
        <View className='completion-container'>
          <ScrollView scrollY className="completion-scroll">
            <View className='completion-content'>
              <Text className='completion-title'>已到最后一页</Text>
              <Text className='completion-subtitle'>已填写 {getVisibleAnsweredQuestions(questionSheet.questions).length} / {getVisibleAnswerQuestions(questionSheet.questions).length} 题</Text>
              <Text className='completion-subtitle'>答案尚未提交，可以返回检查与修改。</Text>
              {submitError ? <Text className="questionnaire-submit-error">{submitError}</Text> : null}
            </View>
          </ScrollView>
          <QuestionnaireBottomActions
            tone={isPersonality ? "personality" : "medical"}
            showPrevious
            previousLabel="返回修改"
            showSubmit={canSubmit}
            submitting={submitting}
            statusMessage={submitting ? "正在提交，请稍候" : submitError ? "提交未确认，可重试" : connected === false ? "当前离线，提交需要联网" : "提交后可查看报告进度"}
            onPrevious={handleToPrevQuestion}
            onSubmit={handleSubmit}
          />
        </View>
      );
    }

    const currentQuestion = questionSheet.questions[curQuestionIndex];
    if (!currentQuestion) return null;
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
          <View className="questionnaire-context">
            <Text className="questionnaire-context__title">{questionSheet.title || (isPersonality ? "人格探索" : "测评问卷")}</Text>
            <Text className="questionnaire-context__note">答案暂存于当前页面，请在提交后再离开。</Text>
            {connected === false ? <Text className="questionnaire-network-notice">当前离线，可继续填写；提交时需要联网。</Text> : null}
          </View>

          <View className='question-card__body'>
            <QuestionnaireProgress {...progress} />

            <ScrollView key={currentQuestion.code} scrollY className="question-scroll" enhanced showScrollbar={false}>
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
