import React, { useState, useEffect } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { AtButton } from "taro-ui";

import { getQuestionnaire } from "../../../../services/api/questionnaireApi";
import { submitQuestionsheet } from "../../../../services/api/questionsheetApi";
import "./singlePageModel.less";

import QsSection from "../../../../components/question/section";
import QsRadio from "../../../../components/question/radio";
import QsText from "../../../../components/question/text";
import QsTextarea from "../../../../components/question/textarea";
import QsNumber from "../../../../components/question/number";
import QsDate from "../../../../components/question//date";
import QsCheckbox from "../../../../components/question/checkbox";
import QsScoreRadio from "../../../../components/question/scoreRadio";
import QsSelect from "../../../../components/question/select";
import WriterRoleDialog from "./WriterRoleDialog";
import { checkQuestion } from "./questionsheet";
import { useThrottle } from "../../../../util/useUtil";

export default props => {
  const { questionsheetid, subSignid, writedCallback, canSubmit } = props;

  const [questionSheet, setQuestionSheet] = useState(null);
  const [curQuestionIndex, setCurQuestionIndex] = useState(-1);

  const [writerRoles, setWriterRoles] = useState([]);
  const [writerRoleCode, setWriterRoleCode] = useState(null);
  const [needWriterRole, setNeedWriterRole] = useState(false);

  useEffect(() => {
    if (questionsheetid) {
      initQuestionSheet(questionsheetid);
    }
  }, [questionsheetid]);

  const initQuestionSheet = id => {
    Taro.showLoading();
    setQuestionSheet(null);
    setWriterRoles([]);
    setWriterRoleCode(null);

    getQuestionnaire(id).then(result => {
      // 新 API 返回的数据结构不同，需要适配
      const questionnaire = result.questionnaire || result;
      // 过滤掉 Section 类型的题目
      questionnaire.questions = questionnaire.questions.filter(q => q.type !== 'Section');
      setQuestionSheet(questionnaire);
      setCurQuestionIndex(0);

      if (result.writer_roles && result.writer_roles.length > 0) {
        // 如果需要填写人，则初始化填写人
        setWriterRoles(
          result.writer_roles.map(v => ({
            label: v.name,
            value: v.code
          }))
        );
        setNeedWriterRole(true);
      }

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
        return <QsSection item={v} index={i}></QsSection>;
      case "Radio":
        return (
          <QsRadio
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsRadio>
        );
      case "CheckBox":
        return (
          <QsCheckbox
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          ></QsCheckbox>
        );
      case "Text":
        return <QsText item={v} index={i} onChangeValue={handleChangeValue} />;
      case "Textarea":
        return (
          <QsTextarea item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Number":
        return (
          <QsNumber item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Date":
        return <QsDate item={v} index={i} onChangeValue={handleChangeValue} />;
      case "ScoreRadio":
        return (
          <QsScoreRadio item={v} index={i} onChangeValue={handleChangeValue} />
        );
      case "Select":
        return (
          <QsSelect item={v} index={i} onChangeValue={handleChangeValue} />
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
        title: qs.title,
        questionsheet_code: qs.code,
        answers: qs.questions.filter(v => getQuestionIsShow(v.show_controller))
      };
    };

    const submitData = clearData(questionSheet);

    submitQuestionsheet(submitData, writerRoleCode, subSignid)
      .then(async result => {
        Taro.showToast({ title: "提交成功", icon: "success" });
        // 传递答卷 ID 和测评 ID（如果有）给回调函数
        await writedCallback(result.id, result.assessment_id);
      })
      .catch(err => {
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

    if (curQuestionIndex >= questionSheet?.questions.length) {
      return (
        <View className='completion-container'>
          <View className='completion-content'>
            <View className='completion-icon'>✓</View>
            <Text className='completion-title'>所有题目已完成</Text>
            <Text className='completion-subtitle'>感谢您认真填写</Text>
          </View>
          <View className='btn-group'>
            <AtButton
              customStyle={{ width: "200rpx" }}
              size='small'
              onClick={handleToPrevQuestion}
            >
              返回修改
            </AtButton>
            {canSubmit ? (
              <AtButton
                customStyle={{ width: "200rpx" }}
                type='primary'
                size='small'
                onClick={handleSubmit}
              >
                提交问卷
              </AtButton>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <>
        {/* 进度信息 */}
        <View className='progress-info'>
          <Text className='progress-number'>{questionNumber}/{totalQuestions}</Text>
        </View>

        {/* 进度条 */}
        <View className='progress-bar-container'>
          <View 
            className='progress-bar' 
            style={{width: `${(questionNumber / totalQuestions) * 100}%`}}
          />
        </View>

        {/* 问题 */}
        <View className='question'>{getQuestionComp(curQuestionIndex)}</View>
        
        {/* 按钮组 */}
        <View className='btn-group'>
          {curQuestionIndex > 0 ? (

            <AtButton
              customStyle={{ width: "200rpx" }}
              size='small'
              onClick={handleToPrevQuestion}
            >
              上一题
            </AtButton>
          ) : null}
          <AtButton
            customStyle={{ width: "200rpx" }}
            type='primary'
            size='small'
            onClick={handleToNextQuestion}
          >
            下一题
          </AtButton>
        </View>
      </>
    );
  };

  return (
    <View className='questionsheet'>
      {questionSheet ? (
        <View
          className='questionsheet-progress'
          style={{
            width: `${parseInt(
              (curQuestionIndex / questionSheet.questions.length) * 100
            )}%`
          }}
        ></View>
      ) : null}

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
