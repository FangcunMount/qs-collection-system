import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
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
  answers?: AssessmentResponseAnswer[];
  assessment_id?: string;
  testee_id?: string;
}

interface QuestionnaireResult {
  code?: string;
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
  const [planTaskId, setPlanTaskId] = useState("");

  const initAnswerSheet = useCallback(async (id: string) => {
    setAnswerSheetId(id);
    try {
      Taro.showLoading({ title: "加载中..." });
      const answerSheetResult = await getAssessmentResponse(id) as AssessmentResponseResult;
      logger.RUN("[AnswerSheet] 答卷数据获取成功:", {
        id: answerSheetResult.id,
        questionnaireCode: answerSheetResult.questionnaire_code,
        answersCount: answerSheetResult.answers?.length,
        assessmentId: answerSheetResult.assessment_id,
        testeeId: answerSheetResult.testee_id,
      });

      const questionnaireResult = await getQuestionnaire(answerSheetResult.questionnaire_code || "") as QuestionnaireResult;
      logger.RUN("[AnswerSheet] 问卷定义获取成功:", {
        code: questionnaireResult.code,
        title: questionnaireResult.title,
        questionsCount: questionnaireResult.questions?.length,
        type: questionnaireResult.type,
      });
      setQuestionnaireType(String(questionnaireResult.type || ""));
      setQuestionnaireTitle(questionnaireResult.title || "");
      setQuestions(mergeQuestionsWithAnswers(
        questionnaireResult.questions || [],
        answerSheetResult.answers || [],
      ));
    } catch (error: unknown) {
      logger.ERROR("[AnswerSheet] 加载失败:", error);
      const details = error as { code?: unknown; errno?: unknown; message?: string };
      const code = String(details.code ?? details.errno ?? "");
      if (code === "100403") setNeedCloseFlag(true);
      else Taro.showToast({ title: details.message || "加载失败", icon: "none" });
    } finally {
      Taro.hideLoading();
    }
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params || {};
    const id = String(params.a || "");
    logger.RUN("did effect <RUN> | params: ", { answersheetid: id });
    setPlanTaskId(String(params.task_id || ""));
    void initAnswerSheet(id);
  }, [initAnswerSheet]);

  const reportAction = questionnaireType === "MedicalScale" ? (
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
          <PlanSubscribeConfirm
            taskId={planTaskId}
            planName={entryContext?.plan_name}
            entryTitle={entryContext?.entry_title || questionnaireTitle}
            clinicianName={entryContext?.clinician_name}
            entryContext={entryContext}
            variant="floating"
          />
          <NeedDialog
            flag={needCloseFlag}
            title="警告"
            content="您没有查看该答卷的权限！"
            btnText="点击退出小程序"
          />
          {questions.map((question, index) => (
            <View key={question.code} className="answersheet-question">
              {renderQuestion(question, index)}
            </View>
          ))}
        </View>
      </PageShell>
      <PrivacyAuthorization />
    </>
  );
};

export default AssessmentResponsePage;
