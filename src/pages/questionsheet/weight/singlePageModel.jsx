import React, { useState, useEffect } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { AtButton } from "taro-ui";

import {
  getQuestionsheet,
  postQuestionsheet
} from "../../../services/api/questionsheetApi";
import "./singlePageModel.less";
import hollowRound from "../../../assets/images/hollow-round.png";

import QsSection from "../../../components/question/section";
import QsRadio from "../../../components/question/radio";
import QsText from "../../../components/question/text";
import QsTextarea from "../../../components/question/textarea";
import QsNumber from "../../../components/question/number";
import QsDate from "../../../components/question//date";
import QsCheckbox from "../../../components/question/checkbox";
import QsScoreRadio from "../../../components/question/scoreRadio";
import QsSelect from "../../../components/question/select";
import WriterRoleDialog from "./WriterRoleDialog";
import { checkQuestion } from "./questionsheet";
import { useThrottle } from "../../../util/useUtil";

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

    getQuestionsheet(id).then(result => {
      setQuestionSheet(result.questionsheet);
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
    if (showController === "") return true;

    const checkShowFlagByQuestions = showController.questions.map(v => {
      const i = questionSheet.questions.findIndex(q => q.code === v.code);
      const question = questionSheet.questions[i];
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
      tmp.questions[itemIndex].options[optionIndex].extend_content = value;
      setQuestionSheet(tmp);
    };

    // update other question value (text/number/textarea) all question with have 'value'
    const handleChangeValue = (value, questionIndex) => {
      const tmp = { ...questionSheet };
      tmp.questions[questionIndex].value = value;
      setQuestionSheet(tmp);
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

    postQuestionsheet(submitData, writerRoleCode, subSignid)
      .then(result => {
        Taro.showToast({ title: "提交成功", icon: "success" });
        writedCallback(result.answersheetid);
      })
      .catch(err => {
        Taro.showToast({ title: err.errmsg, icon: "none" });
      });
  }, 1000);

  const getQuestionContent = () => {
    if (!questionSheet) return null;

    if (curQuestionIndex >= questionSheet?.questions.length) {
      return (
        <View
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <View style={{ flexGrow: "1", textAlign: "center" }}>
            <Text>所有题目都是完成，是否提交问卷？</Text>
          </View>
          <View className='btn-group'>
            <AtButton
              customStyle={{ width: "200rpx" }}
              size='small'
              onClick={handleToPrevQuestion}
            >
              返回
            </AtButton>
            {canSubmit ? (
              <AtButton
                customStyle={{ width: "200rpx" }}
                type='primary'
                size='small'
                onClick={handleSubmit}
              >
                提交
              </AtButton>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <>
        <View className='question'>{getQuestionComp(curQuestionIndex)}</View>
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

      <Text className='questionsheet-title'>{questionSheet?.title}</Text>
      <Image
        className='questionsheet-icon1'
        mode='widthFix'
        src={hollowRound}
      ></Image>
      <View className='question-card'>{getQuestionContent()}</View>
    </View>
  );
};
