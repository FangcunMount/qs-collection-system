import React, { useState, useEffect } from "react";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton } from "taro-ui";

import PageContainer from "../../../../components/pageContainer/pageContainer";

import QsSection from "../../../../components/question/section";
import QsRadio from "../../../../components/question/radio";
import QsText from "../../../../components/question/text";
import QsTextarea from "../../../../components/question/textarea";
import QsNumber from "../../../../components/question/number";
import QsDate from "../../../../components/question//date";
import QsCheckbox from "../../../../components/question/checkbox";
import QsScoreRadio from "../../../../components/question/scoreRadio";
import QsSelect from "../../../../components/question/select";
import QsImageRadio from "../../../../components/question/imageRadio";
import QsImageCheckbox from "../../../../components/question/imageCheckBox";

import "./questionsheet.less";

import SelectWriterRole from "./selectWriterRole";

import { getQuestionnaire } from "../../../../services/api/questionnaireApi";
import { submitQuestionsheet } from "../../../../services/api/questionsheetApi";
import { useSubmit } from "../../../../util/useUtil";
import { isEmpty } from "../../../../util/checkType";
import { getLogger } from "../../../../util/log";
import { filterNonSectionQuestions } from "../../../common/utils/questionUtils";

const PAGE_NAME = "question_sheet";
const logger = getLogger(PAGE_NAME);

/**
 * 从新API的validation_rules数组中获取验证规则
 */
const getValidationRule = (rules, ruleType) => {
  if (!rules || !Array.isArray(rules)) return null;
  const rule = rules.find(r => r.rule_type === ruleType);
  return rule ? rule.target_value : null;
};

export function checkQuestion(question) {
  console.log('in question check, question.value', question.title);
  // 适配新API的validation_rules结构
  const validationRules = question.validation_rules || [];
  console.log('validationRules', validationRules);
  const required = getValidationRule(validationRules, 'required');
  const min_words = getValidationRule(validationRules, 'min_words');
  const max_words = getValidationRule(validationRules, 'max_words');
  const min_value = getValidationRule(validationRules, 'min_value');
  const max_value = getValidationRule(validationRules, 'max_value');
  const min_select = getValidationRule(validationRules, 'min_select');
  const max_select = getValidationRule(validationRules, 'max_select');
  
  const showIndex = question.title.split(".")[0];
  const value = question.value;
  const isValueEmpty = isEmpty(value);
  console.log('question.value', question.value);
  console.log('isValueEmpty', isValueEmpty);

  // 必填验证
  console.log('required', required);
  console.log('required === 1', required === 1);
  console.log('required === "1"', required === "1");
  console.log('required === "true"', required === "true");
  console.log('required === true', required === true);
  if (required && (required === 1 || required === "1" || required === "true" || required === true)) {
    console.log('isValueEmpty', isValueEmpty);
    console.log('if (isValueEmpty)', isValueEmpty);
    if (isValueEmpty) {
      console.log('showToast');
      Taro.showToast({
        title: `第${showIndex}题为必填题`,
        icon: "none"
      });
      return false;
    }
  }

  if (isValueEmpty) return true;

  const textValue = Array.isArray(value) ? value.join("") : String(value ?? "");
  const selectCount = Array.isArray(value) ? value.length : (isValueEmpty ? 0 : 1);

  if (min_words && textValue.length < Number(min_words)) {
    Taro.showToast({
      title: `第${showIndex}题最少字数为 ${min_words}，请检查答题内容`,
      icon: "none"
    });
    return false;
  }

  if (max_words && textValue.length > Number(max_words)) {
    Taro.showToast({
      title: `第${showIndex}题最大字数为 ${max_words}，请检查答题内容`,
      icon: "none"
    });
    return false;
  }

  if (min_value && Number(value) < Number(min_value)) {
    Taro.showToast({
      title: `第${showIndex}题最小值为 ${min_value}`,
      icon: "none"
    });

    return false;
  }

  if (max_value && Number(value) > Number(max_value)) {
    Taro.showToast({
      title: `第${showIndex}题最大值为 ${max_value}`,
      icon: "none"
    });

    return false;
  }

  if (min_select && selectCount < Number(min_select)) {
    Taro.showToast({
      title: `第${showIndex}题最少选择 ${min_select} 个选项`,
      icon: "none"
    });
    return false;
  }

  if (max_select && selectCount > Number(max_select)) {
    Taro.showToast({
      title: `第${showIndex}题最多选择 ${max_select} 个选项`,
      icon: "none"
    });
    return false;
  }

  return true;
}

export default function QuestionSheet({
  canSubmit,
  questionsheetid,
  subSignid,
  writedCallback
}) {
  const [questionSheet, setQuestionSheet] = useState(null);
  const [writerRoles, setWriterRoles] = useState([]);
  const [writerRoleCode, setWriterRoleCode] = useState(null);
  const [scrollTop, setScrollTop] = useState(-1);

  useEffect(() => {
    if (questionsheetid) {
      initQuestionSheet(questionsheetid);
    }
  }, [questionsheetid]);

  /**
   * @description 初始化问卷
   * @param questionsheetid questionsheet code（问卷 code，标志当前要填写的问卷）
   */
  const initQuestionSheet = id => {
    Taro.showLoading();
    setQuestionSheet(null);
    setWriterRoles([]);
    setWriterRoleCode(null);

    getQuestionnaire(id).then(result => {
      logger.RUN('[QuestionSheet] 问卷数据加载成功:', {
        code: result?.code,
        title: result?.title,
        questionsCount: result?.questions?.length,
        hasQuestions: !!result?.questions
      });
      
      // 新 API 返回的数据结构
      setQuestionSheet(result);

      // 如果需要填写人，则初始化填写人（目前新API暂不支持）
      if (result.writer_roles && result.writer_roles.length > 0) {
        setWriterRoles(
          result.writer_roles.map(v => ({
            label: v.name,
            value: v.code
          }))
        );
      }

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
  const getQuestionComp = (v, i) => {
    // update radio or checkbox extend
    const handleChangeRadioExtend = (itemIndex, optionIndex, value) => {
      const tmp = { ...questionSheet };
      // 使用 question_code 查找题目，而不是索引
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
      case "ImageRadio":
        return (
          <QsImageRadio
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          />
        );
      case "ImageCheckBox":
        return (
          <QsImageCheckbox
            item={v}
            index={i}
            onChangeValue={handleChangeValue}
            onChangeExtend={handleChangeRadioExtend}
          />
        );
      default:
        return "";
    }
  };

  /**
   * @description Verify all questions
   * @param {object} questions questions list
   * @returns {boolean} Did the verification succeed?
   */
  const verifyQuestions = questions => {
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
  const verifyQuestion = (q, i) => {
    let result = true;

    if (!checkQuestion(q)) {
      result = false;
    }

    // 校验未通过，需要跳转到问题所在位置
    if (!result) gotoVerifyFailQuestion(i);

    return result;
  };

  const gotoVerifyFailQuestion = i => {
    const query = Taro.createSelectorQuery();
    query
      .select(`#question-${i}`)
      .boundingClientRect()
      .select("#page-container")
      .scrollOffset()
      .exec(res => {
        // 连续变更两次是因为避免同一题多次验证失败无法跳转
        setScrollTop(res[0].top + res[1].scrollTop - 100);
        setScrollTop(res[0].top + res[1].scrollTop - 101);
      });
  };

  // 数据清洗
  const clearData = qs => {
    const tmpQuestions = qs.questions.filter(v =>
      getQuestionIsShow(v.show_controller)
    );
    return {
      name: qs.name || qs.title,
      title: qs.title,
      code: qs.code,
      version: qs.version || '1.0',
      answers: tmpQuestions
    };
  };

  const [subBtnLoading, handleSubmit] = useSubmit({
    beforeSubmit: () => {
      if (writerRoles.length > 0 && !writerRoleCode) {
        Taro.showToast({ title: `请选择填写人`, icon: "none" });
        return false;
      }
      if (!verifyQuestions(questionSheet.questions)) {
        return false;
      }

      return true;
    },
    submit: async () => {
      const submitData = clearData(questionSheet);

      logger.RUN("handleSubmitQuestionSheet <RUN>, params: ", {
        writerRoleCode,
        subSignid
      });

      const res = await submitQuestionsheet(
        submitData,
        writerRoleCode,
        subSignid
      );
      if (res.id) {
        Taro.showToast({ title: "提交成功", icon: "success", mask: true });
        // 传递答卷 ID 和测评 ID（如果有）给回调函数
        await writedCallback(res.id, res.assessment_id);
      }
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "提交中..."
    }
  });

  return (
    <PageContainer scrollTop={scrollTop}>
      <View className="questionnaire-fill-wrapper">
        <View className="qs-header__container">
          <View className="qs-header__title">{questionSheet?.title}</View>
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
              const questionNumber = filterNonSectionQuestions(
                questionSheet.questions.slice(0, i),
                getQuestionIsShow
              ).length;
              
              return (
                <View
                  key={v.code}
                  className="qs-question__container"
                  id={`question-${i}`}
                >
                  {getQuestionComp(v, v.type === 'Section' ? undefined : questionNumber)}
                </View>
              );
            })
          : null}
        {canSubmit ? (
          <View className="qs-bottom">
            <AtButton type="primary" full loading={subBtnLoading} onClick={handleSubmit}>
              提交问卷
            </AtButton>
          </View>
        ) : null}
      </View>
    </PageContainer>
  );
}
