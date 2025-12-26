import React, { useEffect, useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";

import "./index.less";
import NeedDialog from "../../../components/needDialog";
import SelectChildDialog from "./weight/selectChildDialog";
import QuestionSheet from "./weight/questionsheet";
import SinglePageModel from "./weight/singlePageModel";
import InfoConfirm from "./components/InfoConfirm";
import { initTesteeStore } from "../../../store/testeeStore.ts";

import { paramsConcat, parsingScene } from "../../../util";
import { getLogger } from "../../../util/log";
import { getMpEntryParams } from "../../../services/api/commonApi";
import { getQuestionnaire } from "../../../services/api/questionnaireApi";
import { getTestee } from "../../../services/api/testeeApi";
import { request } from "../../../services/servers";
import config from "../../../config";
import {
  getTesteeList as getStoredTesteeList,
  getSelectedTesteeId,
  setSelectedTesteeId,
  subscribeTesteeStore
} from "../../../store";

import { PrivacyAuthorization } from "../../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "question_sheet";
const logger = getLogger(PAGE_NAME);
const handleEntryParams = params => {
  return new Promise((resolve, reject) => {
    if (!params.scene) {
      return resolve(params);
    }

    const np = parsingScene(params.scene);
    if (!np.mpqrcodeid) {
      return resolve(np);
    }

    getMpEntryParams(np.mpqrcodeid)
      .then(result => {
        resolve(result.entry_data);
      })
      .catch(err => {
        reject(err);
      });
  });
};

export default function Index() {
  const [questionsheetid, setQuestionsheetid] = useState(null);
  const [subSignid, setSubSignid] = useState("");
  
  // 新增状态
  const [currentStep, setCurrentStep] = useState('loading'); // loading | confirm | filling
  const [questionnaire, setQuestionnaire] = useState(null);
  const [testeeInfo, setTesteeInfo] = useState(null);

  const canSubmit = true;

  const [needTesteeidFlag, setNeedTesteeidFlag] = useState(false);

  const [selectChildFlag, setSelectChildFlag] = useState(false);
  const [childList, setChildList] = useState(() => getStoredTesteeList());

  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params;

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList }) => {
      setChildList(testeeList);
    });
    return unsubscribe;
  }, []);

  useReady(() => {
    logger.RUN("did show <RUN>, params: ", { ...paramData });

    Taro.showLoading({ mask: true });

    handleEntryParams(paramData).then(result => {
      logger.RUN("did show <RUN>, cleared params: ", result);
      const {
        q: questionsheetCode,
        t: testeeid,
        signid
      } = result;

      signid && setSubSignid(signid);
      result.sp && setIsSinglePage(result.sp === "1");

      beforeEach({ questionsheetCode, testeeid, signid }, async () => {
        setQuestionsheetid(questionsheetCode);
        
        // 加载问卷和受试者信息
        await loadQuestionnaireAndTestee(questionsheetCode);
      });
    });
  }, []);

  useShareAppMessage(() => ({}));

  /**
   * 加载问卷和受试者信息
   */
  const loadQuestionnaireAndTestee = async (questionsheetCode) => {
    try {
      const selectedTesteeId = getSelectedTesteeId();
      
      if (!selectedTesteeId) {
        Taro.hideLoading();
        Taro.showToast({ title: '未选择受试者', icon: 'none' });
        return;
      }

      // 并行加载问卷和受试者信息
      const [questionnaireData, testeeData] = await Promise.all([
        getQuestionnaire(questionsheetCode),
        getTestee(selectedTesteeId)
      ]);

      setQuestionnaire(questionnaireData);
      setTesteeInfo(testeeData);
      setCurrentStep('confirm'); // 进入确认步骤
      
      Taro.hideLoading();
    } catch (error) {
      console.error('加载数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 确认信息，进入填写页面
   */
  const handleConfirmInfo = () => {
    // 根据问卷类型和题目数量决定是否使用单页单题模式
    const questionCount = questionnaire?.questions?.length || 0;
    const questionnaireType = questionnaire?.type;
    
    // 医学量表且题目数少于20时，使用单页单题模式
    if (questionnaireType === 'MedicalScale' && questionCount < 20 && !isSinglePage) {
      setIsSinglePage(true);
    }
    
    setCurrentStep('filling');
  };

  const beforeEach = async (params, next) => {
    const { testeeid, signid } = params;

    // 注意：signid 功能已废弃，不再支持通过 signid 查询答卷ID
    // 如果将来需要恢复此功能，需要后端提供新的 API 接口

    // 如果没有 testeeid，阻断后续操作
    const verifyTesteeFlag = await verifyTestee(testeeid);
    if (!verifyTesteeFlag) {
      Taro.hideLoading();
      return;
    }

    Taro.hideLoading();
    next();
  };

  const verifyTestee = async explicitTesteeId => {
    if (explicitTesteeId) {
      setSelectedTesteeId(explicitTesteeId);
      if (!getStoredTesteeList().length) {
        await initTesteeStore();
      }
      return true;
    }

    let storedList = getStoredTesteeList();
    if (!storedList.length) {
      await initTesteeStore();
      storedList = getStoredTesteeList();
    }

    if (!storedList.length) {
      setNeedTesteeidFlag(true);
      return false;
    }

    if (storedList.length === 1) {
      setSelectedTesteeId(storedList[0].id);
    } else {
      const currentSelected = getSelectedTesteeId();
      const exists = currentSelected && storedList.some(item => item.id === currentSelected);
      if (exists) {
        setSelectedTesteeId(currentSelected);
      } else {
        setChildList(storedList);
        setSelectChildFlag(true);
      }
    }

    return true;
  };

  /**
   * 通过答卷ID获取测评ID
   */
  const getAssessmentIdByAnswersheetId = async (answersheetId) => {
    try {
      logger.RUN('[Fill] 通过答卷ID获取测评ID', { answersheetId });
      const detail = await request(`/answersheets/${String(answersheetId)}/assessment`, {}, {
        host: config.collectionHost,
        needToken: true
      });
      
      if (detail && detail.id) {
        return String(detail.id);
      }
      return null;
    } catch (error) {
      logger.ERROR('[Fill] 通过答卷ID获取测评ID失败', error);
      return null;
    }
  };

  /**
   * 答卷提交成功回调
   * 根据问卷类型跳转到不同页面：
   * - Survey（调查问卷）：跳转到答卷详情页面
   * - MedicalScale（医学量表）：先跳转到等待解析页面，等待解析完成后跳转到解读报告页面
   */
  const writedCallback = async (answersheetid, assessmentId) => {
    const questionnaireType = questionnaire?.type;
    const selectedTesteeId = getSelectedTesteeId();
    
    logger.RUN('[Fill] 答卷提交成功', { 
      answersheetid, 
      assessmentId,
      questionnaireType,
      testeeId: selectedTesteeId 
    });

    if (questionnaireType === 'Survey') {
      // 调查问卷：跳转到答卷详情页面
      Taro.redirectTo({
        url: `/pages/answersheet/detail/index?a=${answersheetid}`
      });
    } else if (questionnaireType === 'MedicalScale') {
      // 医学量表：先跳转到等待解析页面
      // 如果提交接口没有返回 assessmentId，则通过 answersheetId 获取
      let finalAssessmentId = assessmentId;
      if (!finalAssessmentId) {
        logger.RUN('[Fill] 提交接口未返回 assessmentId，通过 answersheetId 获取', { 
          answersheetid 
        });
        finalAssessmentId = await getAssessmentIdByAnswersheetId(answersheetid);
      }

      if (finalAssessmentId) {
        // 有 assessmentId，跳转到等待解析页面
        // 传递 assessmentId、answersheetId 和 testeeId
        const testeeIdParam = selectedTesteeId ? `&t=${selectedTesteeId}` : '';
        Taro.redirectTo({
          url: `/pages/analysis/wait/index?aid=${finalAssessmentId}&a=${answersheetid}${testeeIdParam}`
        });
      } else {
        // 如果仍然无法获取 assessmentId，直接跳转到解析页面（兼容旧逻辑）
        logger.WARN('[Fill] 医学量表无法获取 assessmentId，直接跳转到解析页面', { 
          answersheetid 
        });
        Taro.redirectTo({
          url: `/pages/analysis/index?a=${answersheetid}`
        });
      }
    } else {
      // 未知类型或旧数据：默认跳转到答卷详情页面
      logger.WARN('[Fill] 问卷类型未知，默认跳转到答卷详情', { questionnaireType });
      Taro.redirectTo({
        url: `/pages/answersheet/detail/index?a=${answersheetid}`
      });
    }
  };

  const handleSelectChild = childid => {
    setSelectedTesteeId(childid);
    setSelectChildFlag(false);
  };

  const handleAddChild = () => {
    const params = {
      submitClose: "0",
      goUrl: "/pages/questionnaire/fill/index",
      goParams: JSON.stringify(paramData)
    };
    Taro.redirectTo({ url: paramsConcat("/pages/user/register/index", params) });
  };

  return (
    <>
      <SelectChildDialog
        flag={selectChildFlag}
        childList={childList}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />
      <NeedDialog
        flag={needTesteeidFlag}
        content="暂无受试者，请联系客服。"
      ></NeedDialog>
      
      {/* 第一步：信息确认页面 */}
      {currentStep === 'confirm' && (
        <InfoConfirm
          questionnaire={questionnaire}
          testee={testeeInfo}
          onConfirm={handleConfirmInfo}
        />
      )}
      
      {/* 第二步：问卷填写页面 */}
      {currentStep === 'filling' && (
        <>
          {isSinglePage ? (
            <SinglePageModel
              questionsheetid={questionsheetid}
              subSignid={subSignid}
              writedCallback={writedCallback}
              canSubmit={canSubmit}
            />
          ) : (
            <QuestionSheet
              questionsheetid={questionsheetid}
              subSignid={subSignid}
              writedCallback={writedCallback}
              canSubmit={canSubmit}
            />
          )}
        </>
      )}

      <PrivacyAuthorization />
    </>
  );
}
