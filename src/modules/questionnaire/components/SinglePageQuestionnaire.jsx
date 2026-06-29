import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { getQuestionnaire } from "@/services/api/questionnaires";
import { submitQuestionnaire } from "@/services/api/assessmentSubmissions";
import "./SinglePageQuestionnaire.less";

import QsSection from "./questions/section";
import QsRadio from "./questions/radio";
import QsText from "./questions/text";
import QsTextarea from "./questions/textarea";
import QsNumber from "./questions/number";
import QsDate from "./questions/date";
import QsCheckbox from "./questions/checkbox";
import QsScoreRadio from "./questions/scoreRadio";
import QsSelect from "./questions/select";
import QsImageRadio from "./questions/imageRadio";
import QsImageCheckbox from "./questions/imageCheckBox";
import WriterRoleDialog from "./WriterRoleDialog";
import { checkQuestion } from "./QuestionnaireForm";
import { useThrottle } from "@/shared/hooks/useThrottle";
import { getLogger } from "@/shared/lib/logger";

const PAGE_NAME = "single_page_questionnaire";
const logger = getLogger(PAGE_NAME);

export default props => {
  const {
    questionnaireCode,
    initialQuestionnaire,
    submitContract,
    subSignid,
    writedCallback,
    canSubmit,
    variant = "default"
  } = props;

  const [questionSheet, setQuestionSheet] = useState(null);
  const [curQuestionIndex, setCurQuestionIndex] = useState(-1);

  const [writerRoles, setWriterRoles] = useState([]);
  const [writerRoleCode, setWriterRoleCode] = useState(null);
  const [needWriterRole, setNeedWriterRole] = useState(false);

  const applyQuestionnaire = (result) => {
    const questionnaire = result.questionnaire || result;
    questionnaire.questions = questionnaire.questions.filter(q => q.type !== 'Section');
    setQuestionSheet(questionnaire);
    setCurQuestionIndex(0);

    if (result.writer_roles && result.writer_roles.length > 0) {
      setWriterRoles(
        result.writer_roles.map(v => ({
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

  const initQuestionnaire = id => {
    Taro.showLoading();
    setQuestionSheet(null);
    setWriterRoles([]);
    setWriterRoleCode(null);

    getQuestionnaire(id).then(result => {
      applyQuestionnaire(result);
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
  const getStepNum = (prevOrNext = "next") => {
    let stepNum = 1;
    while (true) {
      let qi = "";
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
    const res = checkQuestion(questionSheet.questions[curQuestionIndex]);
    if (!res) return;

    setCurQuestionIndex(curQuestionIndex + getStepNum("next"));
  };

  /**
   * @description Get whether the current question is displayed
   * @param {object} showController The show and hidden controller for the current question
   * @returns {boolean} Is the question displayed?
   */
  const getQuestionIsShow = showController => {
    if (showController === "" || !showController) return true;
    
    // 安全检查：确保 questionSheet 和 questions 已加载
    if (!questionSheet || !questionSheet.questions) return true;
    
    // 安全检查：确保 showController.questions 存在
    if (!showController.questions || !Array.isArray(showController.questions)) return true;

    const checkShowFlagByQuestions = showController.questions.map(v => {
      const i = questionSheet.questions.findIndex(q => q.code === v.code);
      const question = questionSheet.questions[i];
      
      // 安全检查：确保找到了问题
      if (!question) return false;
      
      if (!getQuestionIsShow(question.show_controller)) {
        return false;
      }

      // 获取问题选中的选项
      let selectedCodes = question.value;

      // 检测每一个 code 是否成功， 或运算，有真则显示
      return v.select_option_codes.reduce((r, o) => {
        if (r) return r;

        // 如果是 string，检测 selectedCode 中是否有该选项
        if (typeof o === "string") {
          return selectedCodes.includes(o);
        }
        // 如果是 array， 检测 selectedCode 中是否有 array 中的每一个选项， 有假则匹配失败
        else {
          return o.reduce((or, ov) => {
            if (!or) return or;
            return selectedCodes.includes(ov);
          }, true);
        }
      }, false);
    });

    switch (showController.rule) {
      case "or":
        return checkShowFlagByQuestions.reduce((r, v) => r || v, false);
      case "and":
        return checkShowFlagByQuestions.reduce((r, v) => r && v, true);
      default:
        return false;
    }
  };

  /**
   * @description get question component
   * @param {object} v question object
   * @param {number} i current question index
   * @returns {JSX.Element}
   */
  const getQuestionComp = i => {
    if (i === -1) return <View></View>;
    const v = questionSheet.questions[i];

    // update radio or checkbox extend
    const handleChangeRadioExtend = (itemIndex, optionIndex, value) => {
      const tmp = { ...questionSheet };
      // 使用 question_code 查找题目，而不是索引，避免索引错位
      const questionIndex = tmp.questions.findIndex(q => q.code === v.code);
      if (questionIndex !== -1) {
        tmp.questions[questionIndex].options[optionIndex].extend_content = value;
        setQuestionSheet(tmp);
      }
    };

    // update other question value (text/number/textarea) all question with have 'value'
    const handleChangeValue = (value, questionIndex) => {
      const tmp = { ...questionSheet };
      // 使用 question_code 查找题目，而不是索引，避免索引错位
      const actualIndex = tmp.questions.findIndex(q => q.code === v.code);
      if (actualIndex !== -1) {
        tmp.questions[actualIndex].value = value;
        setQuestionSheet(tmp);
      }
    };

    switch (v.type) {
      case "Section":
        return <QsSection key={v.code} item={v} index={i}></QsSection>;
      case "Radio":
        return (
          <QsRadio
            key={v.code}
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsRadio>
        );
      case "ImageRadio":
        return (
          <QsImageRadio
            key={v.code}
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsImageRadio>
        );
      case "CheckBox":
        return (
          <QsCheckbox
            key={v.code}
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsCheckbox>
        );
      case "ImageCheckBox":
        return (
          <QsImageCheckbox
            key={v.code}
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsImageCheckbox>
        );
      case "Text":
        return <QsText key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />;
      case "Textarea":
        return (
          <QsTextarea key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Number":
        return (
          <QsNumber key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Date":
        return <QsDate key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />;
      case "ScoreRadio":
        return (
          <QsScoreRadio key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Select":
        return (
          <QsSelect key={v.code} item={v} index={i} onChangeValue={handleChangeValue} />
        );
      default:
        return "";
    }
  };

  const handleSubmit = useThrottle(() => {
    if (writerRoles.length > 0 && !writerRoleCode) {
      Taro.showToast({
        title: `请选择填写人`,
        icon: "none"
      });
      setNeedWriterRole(true);
      return;
    }

    /**
     * @description clear data (questions not shown don't need to submit)
     * @param {Array<Object>} qs: question list
     */
    const clearData = qs => {
      return {
        name: qs.name || qs.title,
        title: qs.title,
        code: submitContract?.questionnaire_code || qs.code,
        version: submitContract?.questionnaire_version || qs.version || "1.0",
        answers: qs.questions.filter(v => getQuestionIsShow(v.show_controller))
      };
    };

    const submitData = clearData(questionSheet);

    Taro.showLoading({
      title: "提交中...",
      mask: true
    });

    submitQuestionnaire(submitData, writerRoleCode, subSignid, {
      onQueued: ({ requestId }) => {
        logger.WARN('[SinglePageQuestionnaire] 提交已进入队列', {
          requestId,
          questionnaireCode: submitData.code
        });
        Taro.showLoading({
          title: "排队处理中",
          mask: true
        });
      },
      onQueueCompleted: ({ requestId, statusResult }) => {
        logger.RUN('[SinglePageQuestionnaire] 队列处理完成', {
          requestId,
          answersheetId: statusResult?.answersheet_id ?? null
        });
      }
    })
      .then(async result => {
        Taro.hideLoading();
        logger.RUN('[SinglePageQuestionnaire] 提交完成', {
          answersheetId: result.id,
          submitMode: result.submit_mode,
          queued: result.queued
        });
        Taro.showToast({ title: "提交成功", icon: "success" });
        // 传递答卷 ID 和测评 ID（如果有）给回调函数
        await writedCallback(result.id, result.assessment_id);
      })
      .catch(err => {
        Taro.hideLoading();
        Taro.showToast({ title: String(err?.errmsg ?? err?.message ?? '提交失败'), icon: "none" });
      });
  }, 1000);

  const getQuestionContent = () => {
    if (!questionSheet) return null;

    // 计算实际问题序号和总数（排除 Section）
    const questionNumber = questionSheet.questions
      .slice(0, curQuestionIndex)
      .filter(q => q.type !== 'Section' && getQuestionIsShow(q.show_controller))
      .length + 1;
    
    const totalQuestions = questionSheet.questions.length;
    const isPersonality = variant === "personality";

    if (curQuestionIndex >= questionSheet?.questions.length) {
      return (
        <View className='completion-container'>
          <View className='completion-content'>
            <View className='completion-icon'>✓</View>
            <Text className='completion-title'>所有题目已完成</Text>
            <Text className='completion-subtitle'>感谢您认真填写</Text>
          </View>
          <View className='btn-group'>
            <View
              className='single-nav-button single-nav-button--prev'
              onClick={handleToPrevQuestion}
            >
              <Text>← 返回修改</Text>
            </View>
            {canSubmit ? (
              <View
                className='single-nav-button single-nav-button--submit'
                onClick={handleSubmit}
              >
                <Text>提交问卷</Text>
              </View>
            ) : null}
          </View>
        </View>
      );
    }

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
            <View className='progress-info'>
              <Text className='progress-number'>{questionNumber}</Text>
              <Text className='progress-total'>/{totalQuestions}</Text>
            </View>

            <View className='progress-bar-container'>
              <View
                className='progress-bar'
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              />
            </View>

            <ScrollView scrollY className="question-scroll" enhanced showScrollbar={false}>
              <View className='question'>{getQuestionComp(curQuestionIndex)}</View>
            </ScrollView>
          </View>
        </View>

        <View className='btn-group'>
          <View
            className={`single-nav-button single-nav-button--prev ${curQuestionIndex > 0 ? "" : "is-disabled"}`}
            onClick={curQuestionIndex > 0 ? handleToPrevQuestion : undefined}
          >
            <Text>← 上一题</Text>
          </View>
          <View
            className='single-nav-button single-nav-button--next'
            onClick={handleToNextQuestion}
          >
            <Text>下一题 →</Text>
          </View>
        </View>
      </>
    );
  };

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
