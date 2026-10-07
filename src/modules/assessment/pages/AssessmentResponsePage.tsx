import React, { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { createRequestLifetime, type RequestLifetime } from "@/services/requestLifetime";
import { getSessionRevision, onSessionCleared } from "@/shared/stores/sessionPrivacy";
import StatePanel from "@/shared/ui/StatePanel";
import { Text as TaroText, View } from "@tarojs/components";

import PageShell from "@/shared/ui/PageShell";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import NeedDialog from "@/shared/ui/NeedDialog";
import { routes } from "@/shared/config/routes";
import { getAssessmentResponse } from "@/services/api/assessmentResponses";
import { getQuestionnaire } from "@/services/api/questionnaires";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { getLogger } from "@/shared/lib/logger";
import Section from "../../questionnaire/components/questions/section";
import Radio from "../../questionnaire/components/questions/radio";
import Checkbox from "../../questionnaire/components/questions/checkbox";
import TextQuestion from "../../questionnaire/components/questions/text";
import NumberQuestion from "../../questionnaire/components/questions/number";
import Textarea from "../../questionnaire/components/questions/textarea";
import DateQuestion from "../../questionnaire/components/questions/date";
import ScoreRadio from "../../questionnaire/components/questions/scoreRadio";
import Select from "../../questionnaire/components/questions/select";
import ImageRadio from "../../questionnaire/components/questions/imageRadio";
import ImageCheckBox from "../../questionnaire/components/questions/imageCheckBox";
import ExportImageDialog from "../components/response/exportImageDialog";
import { mergeQuestionsWithAnswers } from "../lib/assessmentResponseFlow";
import type {
  AssessmentResponseAnswer,
  AssessmentResponseQuestion,
} from "../types";
import "./AssessmentResponsePage.less";

const logger = getLogger("answersheet");
const noop = () => undefined;

interface AssessmentResponseResult {
  id?: string;
  questionnaire_code?: string;
  questionnaire_version?: string;
  answers?: AssessmentResponseAnswer[];
  assessment_id?: string;
  testee_id?: string;
}

interface QuestionnaireResult {
  code?: string;
  version?: string;
  title?: string;
  type?: string;
  questions?: AssessmentResponseQuestion[];
}

const renderQuestion = (question: AssessmentResponseQuestion, index: number) => {
  switch (question.type) {
    case "Section":
      return <Section item={question} index={index} />;
    case "Radio":
      return <Radio item={question} index={index} disabled onChangeValue={noop} onChangeExtend={noop} />;
    case "CheckBox":
      return <Checkbox item={question} index={index} disabled onChangeValue={noop} onChangeExtend={noop} />;
    case "Text":
      return <TextQuestion item={question} index={index} disabled onChangeValue={noop} />;
    case "Textarea":
      return <Textarea item={question} index={index} disabled onChangeValue={noop} />;
    case "Number":
      return <NumberQuestion item={question} index={index} disabled onChangeValue={noop} />;
    case "Date":
      return <DateQuestion item={question} index={index} disabled onChangeValue={noop} />;
    case "ScoreRadio":
      return <ScoreRadio item={question} index={index} disabled onChangeValue={noop} onChangeExtend={noop} />;
    case "ImageRadio":
      return <ImageRadio item={question} index={index} disabled onChangeValue={noop} onChangeExtend={noop} />;
    case "ImageCheckBox":
      return <ImageCheckBox item={question} index={index} disabled onChangeValue={noop} onChangeExtend={noop} />;
    case "Select":
      return <Select item={question} index={index} disabled onChangeValue={noop} />;
    default:
      return null;
  }
};

const AssessmentResponsePage = () => {
  const [questions, setQuestions] = useState<AssessmentResponseQuestion[]>([]);
  const [answerSheetId, setAnswerSheetId] = useState("");
  const [questionnaireTitle, setQuestionnaireTitle] = useState("");
  const [questionnaireType, setQuestionnaireType] = useState("");
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const [exportImageFlag, setExportImageFlag] = useState(false);
  const [entryContext] = useState(() => getAssessmentEntryContext());
  const params = Taro.getCurrentInstance().router?.params || {};
  const routeAnswerSheetId = String(params.a || "");
  const planTaskId = String(params.task_id || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const lifetimeRef = useRef<RequestLifetime | null>(null);
  const visible = useRef(true);
  const reloadOnShow = useRef(false);
  const clearAnswers = useCallback(() => {
    setQuestions([]);
    setAnswerSheetId("");
    setQuestionnaireTitle("");
    setQuestionnaireType("");
    setExportImageFlag(false);
    setNeedCloseFlag(false);
  }, []);
  const invalidate = useCallback(() => {
    requestVersion.current += 1;
    lifetimeRef.current?.cancel();
    lifetimeRef.current = null;
  }, []);
  useEffect(() => onSessionCleared(() => {
    invalidate();
    reloadOnShow.current = false;
    clearAnswers();
    setLoading(false);
    setError("登录状态已变化，请重新打开答卷。");
  }), [clearAnswers, invalidate]);

  const initAnswerSheet = useCallback(async () => {
    invalidate();
    const version = requestVersion.current;
    const session = getSessionRevision();
    const lifetime = createRequestLifetime(() => visible.current && version === requestVersion.current && session === getSessionRevision());
    lifetimeRef.current = lifetime;
    const isCurrent = () => lifetime.isActive();
    clearAnswers();
    setLoading(true);
    setError("");
    try {
      if (!routeAnswerSheetId) throw new Error("缺少答卷编号，请从测评记录重新进入。");
      const answerSheet = await getAssessmentResponse(routeAnswerSheetId, { showLoading: false, lifetime }) as AssessmentResponseResult;
      if (!isCurrent()) return;
      if (String(answerSheet.id || "") !== routeAnswerSheetId) throw new Error("答卷身份不匹配，请从测评记录重新进入。");
      if (!answerSheet.questionnaire_code || !answerSheet.questionnaire_version) throw new Error("缺少原始题版，暂时无法核对这份答卷。");
      const questionnaire = await getQuestionnaire(answerSheet.questionnaire_code, answerSheet.questionnaire_version, { lifetime }) as QuestionnaireResult;
      if (!isCurrent()) return;
      if (questionnaire.code !== answerSheet.questionnaire_code || questionnaire.version !== answerSheet.questionnaire_version) throw new Error("原始题版不匹配，暂时无法展示这份答卷。");
      setAnswerSheetId(routeAnswerSheetId);
      setQuestionnaireType(String(questionnaire.type || ""));
      setQuestionnaireTitle(questionnaire.title || "");
      setQuestions(mergeQuestionsWithAnswers(questionnaire.questions || [], answerSheet.answers || []));
      logger.RUN("[AnswerSheet] 原始题版核对完成", { answersheetId: routeAnswerSheetId, questionnaireCode: questionnaire.code, questionnaireVersion: questionnaire.version, answersCount: answerSheet.answers?.length });
    } catch (loadError: unknown) {
      if (!isCurrent()) return;
      logger.ERROR("[AnswerSheet] 加载失败", loadError);
      const details = loadError as { code?: unknown; errno?: unknown; statusCode?: unknown; message?: string };
      const code = String(details.code ?? details.errno ?? details.statusCode ?? "");
      if (code === "100403" || code === "403") {
        setNeedCloseFlag(true);
        setError("没有查看这份答卷的权限，请返回测评记录。");
      } else {
        const localMessages = ["缺少答卷编号，请从测评记录重新进入。", "答卷身份不匹配，请从测评记录重新进入。", "缺少原始题版，暂时无法核对这份答卷。", "原始题版不匹配，暂时无法展示这份答卷。"];
        setError(localMessages.includes(details.message || "") ? details.message || "" : "暂时无法读取原始答卷，请稍后重试。");
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [routeAnswerSheetId, clearAnswers, invalidate]);

  useDidHide(() => {
    visible.current = false;
    reloadOnShow.current = true;
    invalidate();
    clearAnswers();
  });
  useDidShow(() => {
    visible.current = true;
    if (!reloadOnShow.current) return;
    reloadOnShow.current = false;
    void initAnswerSheet();
  });
  useEffect(() => {
    void initAnswerSheet();
    return invalidate;
  }, [initAnswerSheet, invalidate]);

  const reportAction = !loading && !error && questionnaireType === "MedicalScale" ? (
    <BottomActionBar>
      <ActionButton
        tone="medical"
        block
        disabled={!answerSheetId}
        onClick={() => {
          Taro.redirectTo({
            url: routes.assessmentReport({
              a: answerSheetId,
              task_id: planTaskId || undefined,
            }),
          });
        }}
      >
        查看解读报告
      </ActionButton>
    </BottomActionBar>
  ) : undefined;

  return (
    <>
      {exportImageFlag ? (
        <ExportImageDialog
          onClose={() => setExportImageFlag(false)}
          onOk={() => setExportImageFlag(false)}
          questions={questions}
          flag={exportImageFlag}
        />
      ) : null}
      <PageShell tone="medical" fixedAction={reportAction} className="answersheet-page">
        <View className="answersheet-header">
          <TaroText className="answersheet-header__eyebrow">原始答卷</TaroText>
          <TaroText className="answersheet-header__title">{questionnaireTitle || "答卷详情"}</TaroText>
          <TaroText className="answersheet-header__description">答案仅供查看，不会在此页面被修改。</TaroText>
        </View>
        <View className="answersheet-content">
          {!loading && !error ? <PlanSubscribeConfirm
            taskId={planTaskId}
            planName={entryContext?.plan_name}
            entryTitle={entryContext?.entry_title || questionnaireTitle}
            clinicianName={entryContext?.clinician_name}
            entryContext={entryContext}
            variant="floating"
          /> : null}
          <NeedDialog
            flag={needCloseFlag}
            title="警告"
            content="您没有查看该答卷的权限！"
            btnText="点击退出小程序"
          />
          {loading ? <StatePanel state="loading" title="正在核对原始答卷" />
            : error ? <StatePanel state="error" title="暂时无法查看答卷" description={error} actionText="重新加载" onAction={() => void initAnswerSheet()} />
            : !questions.length ? <StatePanel state="empty" title="没有可展示的题目" description="这份答卷没有可读取的题目，请返回测评记录。" /> : null}
          {!loading && !error ? questions.map((question, index) => (
            <View key={question.code} className="answersheet-question">
              {renderQuestion(question, index)}
            </View>
          )) : null}
        </View>
      </PageShell>
      <PrivacyAuthorization />
    </>
  );
};

export default AssessmentResponsePage;
