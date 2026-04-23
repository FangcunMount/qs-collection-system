import React, { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text as TaroText } from "@tarojs/components";

import { AtButton } from "taro-ui";

import PageContainer from "@/shared/ui/PageContainer";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import NeedDialog from "@/shared/ui/NeedDialog";
import { routes } from "@/shared/config/routes";
import { getAssessmentResponse } from "@/services/api/assessmentResponses";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { getQuestionnaire } from "@/services/api/questionnaires";
import { getLogger } from "@/shared/lib/logger";
import Section from "../../questionnaire/components/questions/section";
import Radio from "../../questionnaire/components/questions/radio";
import Checkbox from "../../questionnaire/components/questions/checkbox";
import Text from "../../questionnaire/components/questions/text";
import Number from "../../questionnaire/components/questions/number";
import Textarea from "../../questionnaire/components/questions/textarea";
import Date from "../../questionnaire/components/questions/date";
import ScoreRadio from "../../questionnaire/components/questions/scoreRadio";
import Select from "../../questionnaire/components/questions/select";
import ImageRadio from "../../questionnaire/components/questions/imageRadio";
import ImageCheckBox from "../../questionnaire/components/questions/imageCheckBox";
import "./AssessmentResponsePage.less";

import ExportImageDialog from "../components/response/exportImageDialog";

const PAGE_NAME = "answersheet";
const logger = getLogger(PAGE_NAME);

const AnswerSheet = () => {
  const [questions, setQuestions] = useState([]);
  const [answersheetid, setAnswersheetid] = useState(-1);
  const [questionnaireTitle, setQuestionnaireTitle] = useState('');
  
  const [questionnaireType, setQuestionnaireType] = useState('');

  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const [exportImageFlag, setExportImageFlag] = useState(false);
  const [entryContext] = useState(() => getAssessmentEntryContext());
  const [planTaskId, setPlanTaskId] = useState("");

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("did effect <RUN> | params: ", { answersheetid: params.a });
    setPlanTaskId(params.task_id || "");
    initAnswerSheet(params.a);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 初始化答卷数据
   * 策略：分别获取答卷数据和问卷定义，然后合并
   * 1. 获取答卷数据（包含答案信息）
   * 2. 获取问卷定义（包含问题题干、选项等）
   * 3. 根据 question_code 合并两部分数据
   */
  const initAnswerSheet = async (id) => {
    setAnswersheetid(id);

    try {
      Taro.showLoading({ title: '加载中...' });

      // 第一步：获取答卷数据
      const answersheetResult = await getAssessmentResponse(id);
      logger.RUN('[AnswerSheet] 答卷数据获取成功:', { 
        id: answersheetResult.id,
        questionnaireCode: answersheetResult.questionnaire_code,
        answersCount: answersheetResult.answers?.length,
        assessmentId: answersheetResult.assessment_id,
        testeeId: answersheetResult.testee_id
      });
      
      // 保留日志中的测评与受试者信息，按钮跳转统一使用答卷ID

      // 第二步：根据答卷中的问卷编码获取问卷定义
      const questionnaireCode = answersheetResult.questionnaire_code;
      const questionnaireResult = await getQuestionnaire(questionnaireCode);
      logger.RUN('[AnswerSheet] 问卷定义获取成功:', { 
        code: questionnaireResult.code,
        title: questionnaireResult.title,
        questionsCount: questionnaireResult.questions?.length,
        type: questionnaireResult.type 
      });
      setQuestionnaireType(String(questionnaireResult?.type || ''));
      setQuestionnaireTitle(questionnaireResult?.title || '');

      // 第三步：合并数据 - 将答卷的答案与问卷的问题匹配
      const mergedQuestions = mergeQuestionsWithAnswers(
        questionnaireResult.questions,
        answersheetResult.answers
      );

      setQuestions(mergedQuestions);
      Taro.hideLoading();
      
    } catch (err) {
      logger.ERROR('[AnswerSheet] 加载失败:', err);
      Taro.hideLoading();
      
      const code = String(err?.code ?? err?.errno ?? '');
      if (code === "100403") {
        setNeedCloseFlag(true);
      } else {
        Taro.showToast({ 
          title: err?.message || '加载失败', 
          icon: 'none' 
        });
      }
    }
  };

  /**
   * 合并问卷问题和答卷答案
   * @param {Array} questionList - 问卷问题列表（来自问卷定义）
   * @param {Array} answerList - 答案列表（来自答卷数据）
   * @returns {Array} 合并后的问题列表
   */
  const mergeQuestionsWithAnswers = (questionList, answerList) => {
    if (!questionList || !answerList) return [];

    // 创建答案映射表，便于快速查找
    const answerMap = {};
    answerList.forEach(answer => {
      answerMap[answer.question_code] = answer;
    });

    let questionIndex = 1;
    
    return questionList.map(question => {
      const answer = answerMap[question.code];
      
      // 为非Section题型添加题号
      if (question.type !== "Section") {
        question.title = `${questionIndex}. ${question.title}`;
        questionIndex++;
      }

      // 如果有答案，处理答案值和选项选中状态
      if (answer && answer.value) {
        let answerValue = answer.value;
        
        // 对于多选题，value 是 JSON 字符串数组
        try {
          if (question.type === 'CheckBox' || question.type === 'ImageCheckBox') {
            answerValue = JSON.parse(answer.value);
          }
        } catch (e) {
          // 如果解析失败，保持原值
        }

        question.value = answerValue;
        question.score = answer.score || 0;

        // 标记选项的选中状态
        if (question.options && Array.isArray(question.options)) {
          question.options = question.options.map(option => {
            let isSelected = false;
            
            if (Array.isArray(answerValue)) {
              // 多选题
              isSelected = answerValue.includes(option.code);
            } else {
              // 单选题
              isSelected = option.code === answerValue;
            }
            
            return {
              ...option,
              is_select: isSelected ? '1' : '0'
            };
          });
        }
      } else {
        // 没有答案，初始化为空
        question.value = question.type === 'CheckBox' || question.type === 'ImageCheckBox' ? [] : '';
        question.score = 0;
      }

      return question;
    });
  };

  const getQuestionComp = (v, i) => {
    switch (v.type) {
      case "Section":
        return <Section item={v} index={i}></Section>;
      case "Radio":
        return (
          <Radio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></Radio>
        );
      case "CheckBox":
        return (
          <Checkbox
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          />
        );
      case "Text":
        return <Text item={v} index={i} disabled onChangeValue={() => {}} />;
      case "Textarea":
        return (
          <Textarea item={v} index={i} disabled onChangeValue={() => {}} />
        );
      case "Number":
        return <Number item={v} index={i} disabled onChangeValue={() => {}} />;
      case "Date":
        return <Date item={v} index={i} disabled onChangeValue={() => {}} />;
      case "ScoreRadio":
        return (
          <ScoreRadio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ScoreRadio>
        );
      case "ImageRadio":
        return (
          <ImageRadio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ImageRadio>
        );
      case "ImageCheckBox":
        return (
          <ImageCheckBox
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ImageCheckBox>
        );
      case "Select":
        return <Select item={v} index={i} disabled onChangeValue={() => {}} />;
      default:
        return "";
    }
  };


  return (
    <>
      {exportImageFlag && (
        <ExportImageDialog
          onClose={() => setExportImageFlag(false)}
          onOk={() => setExportImageFlag(false)}
          questions={questions}
          flag={exportImageFlag}
        ></ExportImageDialog>
      )}
      <PageContainer>
        <View className="answersheet-detail-wrapper">
          {/* 页面标题区域 */}
          <View className="answersheet-header">
            <View className="answersheet-header-title">{questionnaireTitle || '答卷详情'}</View>
          </View>

          {/* 问题列表 */}
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
            ></NeedDialog>
            {questions.map((v, i) => (
              <View key={v.code} className="as-question__container">
                {getQuestionComp(v, i)}
              </View>
            ))}
          </View>

          {/* 底部操作栏 */}
          {questionnaireType === 'MedicalScale' && (
            <View className="answersheet-footer-actions">
              <AtButton
                type="primary"
                size="normal"
                className="footer-btn"
                onClick={() => {
                  Taro.redirectTo({
                    url: routes.assessmentReport({
                      a: answersheetid,
                      task_id: planTaskId || undefined,
                    })
                  });
                }}
              >
                <TaroText>查看解读报告</TaroText>
              </AtButton>
            </View>
          )}
        </View>
      </PageContainer>

      <PrivacyAuthorization />
    </>
  );
};

export default AnswerSheet;
