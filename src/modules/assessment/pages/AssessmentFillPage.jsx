import React, { useEffect, useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";
import { View, Text, Image, ScrollView, Picker } from "@tarojs/components";

import { ROUTES, routes } from "@/shared/config/routes";
import { getAssessmentEntryContext, setAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import {
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { requestPlanSubscribe } from "@/shared/ui/PlanSubscribeConfirm";
import QuestionnaireForm from "../../questionnaire/components/QuestionnaireForm";
import SinglePageQuestionnaire from "../../questionnaire/components/SinglePageQuestionnaire";
import { getValidQuestionCount, getEstimatedTime } from "../../questionnaire/lib/questionUtils";
import "./AssessmentFillPage.less";

import { getLogger } from "@/shared/lib/logger";
import { getQuestionnaire } from "@/services/api/questionnaires";
import { getTestee } from "@/services/api/testees";
import {
  loadPersonalitySessionForFill,
} from "../lib/personalityQuestionnaire";
import { normalizeAssessmentEntryParams } from "../lib/assessmentEntryParams";
import {
  INVALID_ENTRY_STATUSES,
  hasEntryContext,
  redirectToEntryError,
  resolveAssessmentFillEntryParams,
  resolveEntryStatusText,
  resolvePlanTaskId,
} from "../lib/assessmentFillEntry";
import {
  buildPostSubmitRedirectUrl,
  resolvePostSubmitNavigationKind,
} from "../lib/assessmentSubmitNavigation";

const PAGE_NAME = "questionnaire_fill";
const logger = getLogger(PAGE_NAME);

export default function Index() {
  const [questionnaireCode, setQuestionnaireCode] = useState(null);
  const [modelCode, setModelCode] = useState(null);
  const [isPersonalityFlow, setIsPersonalityFlow] = useState(false);
  const [submitContract, setSubmitContract] = useState(null);
  const [personalitySession, setPersonalitySession] = useState(null);
  const [subSignid, setSubSignid] = useState("");
  
  // 状态管理
  const [currentStep, setCurrentStep] = useState('loading'); // loading | ready | filling
  const [questionnaire, setQuestionnaire] = useState(null);
  const [testeeInfo, setTesteeInfo] = useState(null);
  const [testeeList, setTesteeList] = useState([]);
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(null);
  const [entryContext, setEntryContextState] = useState(() => getAssessmentEntryContext());

  const canSubmit = true;
  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params;
  const entryParams = normalizeAssessmentEntryParams(paramData);
  const planTaskId = resolvePlanTaskId(paramData, entryContext);
  const shouldDirectStartPersonality = (nextModelCode) => {
    return Boolean(nextModelCode && entryParams.startImmediately);
  };

  // 订阅 testee store 变化
  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList: newTesteeList, selectedTesteeId: newSelectedId }) => {
      setTesteeList(newTesteeList);
      setSelectedTesteeIdState(newSelectedId);
    });
    return unsubscribe;
  }, []);

  useReady(() => {
    logger.RUN("did show <RUN>, params: ", { ...paramData });

    Taro.showLoading({ mask: true });

    resolveAssessmentFillEntryParams(paramData).then(result => {
      logger.RUN("did show <RUN>, cleared params: ", result);
      if (paramData.scene || hasEntryContext(result)) {
        setAssessmentEntryContext(result);
        setEntryContextState(getAssessmentEntryContext());
      }
      const {
        q: nextQuestionnaireCode,
        mc: legacyModelCode,
        t: testeeid,
        signid
      } = result;

      const normalizedEntry = normalizeAssessmentEntryParams({
        ...paramData,
        ...result,
        mc: legacyModelCode || paramData.mc || paramData.model_code,
        model_code: result.model_code || paramData.model_code || legacyModelCode || paramData.mc,
        t: testeeid || paramData.t || paramData.testee_id,
        testee_id: result.testee_id || paramData.testee_id || testeeid || paramData.t,
        q: nextQuestionnaireCode || paramData.q,
      });

      const personalityModelCode = normalizedEntry.modelCode;
      const resolvedQuestionnaireCode = personalityModelCode ? null : (normalizedEntry.questionnaireCode || nextQuestionnaireCode);

      if ((paramData.scene || hasEntryContext(result)) && result?.entry_status && INVALID_ENTRY_STATUSES.has(result.entry_status)) {
        redirectToEntryError({
          title: "入口暂不可用",
          text: resolveEntryStatusText(result.entry_status),
          desc: "请联系推荐人员获取新的测评入口，或返回首页重新选择量表。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }

      if ((paramData.scene || hasEntryContext(result)) && !result?.q && !personalityModelCode) {
        redirectToEntryError({
          title: "入口内容不存在",
          text: "当前入口未找到可填写的问卷或量表",
          desc: "该入口可能已失效，或对应内容已下线。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }

      signid && setSubSignid(signid);
      result.sp && setIsSinglePage(result.sp === "1" || normalizedEntry.singlePage);

      if (personalityModelCode) {
        setModelCode(personalityModelCode);
        setIsPersonalityFlow(true);
      }

      beforeEach({ questionnaireCode: resolvedQuestionnaireCode, modelCode: personalityModelCode, testeeid, signid }, async () => {
        setQuestionnaireCode(resolvedQuestionnaireCode);
        await initPageData(resolvedQuestionnaireCode, personalityModelCode, testeeid, result);
      });
    }).catch((error) => {
      console.error('解析入口参数失败:', error);
      redirectToEntryError({
        title: "入口解析失败",
        text: "当前二维码或入口链接无法识别",
        desc: "请重新扫码，或联系推荐人员确认入口是否有效。",
        buttonText: "返回首页",
        buttonUrl: routes.tabHome()
      });
    });
  }, []);

  useShareAppMessage(() => ({}));

  /**
   * 初始化页面数据
   * 1. 重新初始化 testee store
   * 2. 根据 testee 数量决定是否自动选择
   * 3. 加载问卷数据
   */
  const initPageData = async (nextQuestionnaireCode, nextModelCode, explicitTesteeId, entryParams) => {
    try {
      await refreshTesteeList();

      const storedList = getStoredTesteeList();

      if (!storedList.length) {
        Taro.hideLoading();
        const params = {
          submitClose: "0",
          goUrl: ROUTES.assessmentFill,
          goParams: JSON.stringify(entryParams || paramData)
        };
        Taro.redirectTo({ url: routes.testeeCreate(params) });
        return;
      }

      if (explicitTesteeId) {
        setSelectedTesteeId(explicitTesteeId);
        await loadAssessmentContent(nextQuestionnaireCode, nextModelCode, explicitTesteeId, entryParams);
        return;
      }

      if (storedList.length === 1) {
        const singleTesteeId = storedList[0].id;
        setSelectedTesteeId(singleTesteeId);
        await loadAssessmentContent(nextQuestionnaireCode, nextModelCode, singleTesteeId, entryParams);
      } else {
        setSelectedTesteeId(null);
        setTesteeList(storedList);
        await loadAssessmentContentOnly(nextQuestionnaireCode, nextModelCode, entryParams);
      }
    } catch (error) {
      console.error('初始化页面数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  const loadPersonalitySession = async (nextModelCode, testeeId) => {
    const { sessionVM, questionnaireData, submitContract: nextSubmitContract } =
      await loadPersonalitySessionForFill({ modelCode: nextModelCode, testeeId });

    setPersonalitySession(sessionVM);
    setSubmitContract(nextSubmitContract);
    return questionnaireData;
  };

  const loadAssessmentContentOnly = async (nextQuestionnaireCode, nextModelCode, entryParams) => {
    try {
      if (nextModelCode) {
        setCurrentStep('ready');
        Taro.hideLoading();
        return;
      }

      const questionnaireData = await getQuestionnaire(nextQuestionnaireCode);
      setQuestionnaire(questionnaireData);
      setCurrentStep('ready');
      Taro.hideLoading();
    } catch (error) {
      console.error('加载问卷失败:', error);
      Taro.hideLoading();
      if (hasEntryContext(entryParams)) {
        redirectToEntryError({
          title: "入口内容暂不可用",
          text: "当前入口对应的量表或问卷无法打开",
          desc: "内容可能已下线，或该入口已失效。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }
      Taro.showToast({ title: '加载问卷失败，请重试', icon: 'none' });
    }
  };

  const loadAssessmentContent = async (nextQuestionnaireCode, nextModelCode, testeeId, entryParams) => {
    try {
      const [questionnaireData, testeeData] = await Promise.all([
        nextModelCode
          ? loadPersonalitySession(nextModelCode, testeeId)
          : getQuestionnaire(nextQuestionnaireCode),
        getTestee(testeeId)
      ]);

      setQuestionnaire(questionnaireData);
      setTesteeInfo(testeeData);
      if (shouldDirectStartPersonality(nextModelCode)) {
        setIsSinglePage(true);
        setCurrentStep('filling');
      } else {
        setCurrentStep('ready');
      }
      Taro.hideLoading();
    } catch (error) {
      console.error('加载数据失败:', error);
      Taro.hideLoading();
      if (hasEntryContext(entryParams) || nextModelCode) {
        redirectToEntryError({
          title: nextModelCode ? "人格测评暂不可用" : "入口内容暂不可用",
          text: nextModelCode
            ? (error?.message || "当前人格模型无法开始测评")
            : "当前入口对应的量表或档案信息无法加载",
          desc: nextModelCode
            ? "模型可能未发布或题版不可用，请稍后重试。"
            : "请稍后重试，或联系推荐人员确认入口状态。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 选择档案
   */
  const handleTesteeChange = async (testeeId) => {
    if (!testeeId) return;

    setSelectedTesteeId(testeeId);

    try {
      const testeeData = await getTestee(testeeId);
      setTesteeInfo(testeeData);

      if (isPersonalityFlow && modelCode) {
        Taro.showLoading({ mask: true });
        const questionnaireData = await loadPersonalitySession(modelCode, testeeId);
        setQuestionnaire(questionnaireData);
        Taro.hideLoading();
      }
    } catch (error) {
      console.error('加载档案信息失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载档案信息失败', icon: 'none' });
    }
  };

  /**
   * 开始填写问卷
   */
  const handleStartFill = async () => {
    if (entryContext?.entry_status && INVALID_ENTRY_STATUSES.has(entryContext.entry_status)) {
      redirectToEntryError({
        title: "入口暂不可用",
        text: resolveEntryStatusText(entryContext.entry_status),
        desc: "请联系推荐人员获取新的测评入口，或返回首页重新选择量表。",
        buttonText: "返回首页",
        buttonUrl: routes.tabHome()
      });
      return;
    }

    if (!selectedTesteeId) {
      Taro.showToast({ title: '请先选择档案', icon: 'none' });
      return;
    }

    if (!testeeInfo) {
      Taro.showToast({ title: '档案信息加载中，请稍候', icon: 'none' });
      return;
    }

    if (isPersonalityFlow && modelCode && !questionnaire?.questions?.length) {
      try {
        Taro.showLoading({ mask: true });
        const questionnaireData = await loadPersonalitySession(modelCode, selectedTesteeId);
        setQuestionnaire(questionnaireData);
        Taro.hideLoading();
      } catch (error) {
        Taro.hideLoading();
        Taro.showToast({ title: error?.message || '加载题版失败', icon: 'none' });
        return;
      }
    }

    try {
      const subscribeResult = await requestPlanSubscribe({
        taskId: planTaskId,
        planName: entryContext?.plan_name,
        entryTitle: entryContext?.entry_title || questionnaire?.title,
        clinicianName: entryContext?.clinician_name,
        entryContext
      });

      logger.RUN('[Fill] 开始测评前触发订阅提醒', subscribeResult);

      if (subscribeResult.status === 'accepted') {
        Taro.showToast({
          title: '已订阅下一次测评开放提醒',
          icon: 'success'
        });
      } else if (subscribeResult.status === 'ban') {
        Taro.showToast({
          title: '请在微信设置中开启测评提醒',
          icon: 'none'
        });
      }
    } catch (error) {
      logger.WARN('[Fill] 开始测评前触发订阅提醒失败', error);
      Taro.showToast({
        title: String(error?.errMsg || error?.message || '订阅失败，请稍后重试'),
        icon: 'none'
      });
    }

    // 根据问卷类型和题目数量决定是否使用单页单题模式
    const questionCount = questionnaire?.questions?.length || 0;
    const questionnaireType = questionnaire?.type;

    if (questionnaireType === 'PersonalityAssessment' || isPersonalityFlow) {
      setIsSinglePage(true);
    } else if (questionnaireType === 'MedicalScale' && questionCount < 20 && !isSinglePage) {
      setIsSinglePage(true);
    }
    
    setCurrentStep('filling');
  };

  const beforeEach = async (params, next) => {
    const { testeeid, signid } = params;

    // 注意：signid 功能已废弃，不再支持通过 signid 查询答卷ID
    // 如果将来需要恢复此功能，需要后端提供新的 API 接口

    Taro.hideLoading();
    next();
  };

  /**
   * 答卷提交成功回调
   */
  const writedCallback = async (answersheetid, assessmentId, requestId) => {
    const questionnaireType = questionnaire?.type;
    const selectedTesteeId = getSelectedTesteeId();

    logger.RUN('[Fill] 答卷提交成功', {
      answersheetid,
      assessmentId,
      requestId,
      questionnaireType,
      testeeId: selectedTesteeId,
      navigation: resolvePostSubmitNavigationKind({ questionnaireType, isPersonalityFlow }),
    });

    if (
      questionnaireType !== 'Survey' &&
      questionnaireType !== 'PersonalityAssessment' &&
      questionnaireType !== 'MedicalScale' &&
      !isPersonalityFlow
    ) {
      logger.WARN('[Fill] 问卷类型未知，默认跳转到答卷详情', { questionnaireType });
    }

    Taro.redirectTo({
      url: buildPostSubmitRedirectUrl({
        questionnaireType,
        isPersonalityFlow,
        answersheetId: answersheetid,
        assessmentId,
        requestId,
        testeeId: selectedTesteeId,
        planTaskId,
      }),
    });
  };

  const handleAddChild = () => {
    const params = {
      submitClose: "0",
      goUrl: ROUTES.assessmentFill,
      goParams: JSON.stringify(paramData)
    };
    Taro.redirectTo({ url: routes.testeeCreate(params) });
  };

  // 准备档案选择器的选项
  const testeePickerOptions = testeeList.map(item => ({
    label: item.legalName || item.name || '未命名',
    value: item.id
  }));

  const readyTitle = questionnaire?.title || (isPersonalityFlow ? '人格测评' : '');
  const readyQuestionCount = questionnaire?.questions?.length
    ? getValidQuestionCount(questionnaire.questions)
    : (isPersonalityFlow ? '--' : 0);
  const readyEstimatedTime = questionnaire?.questions?.length
    ? getEstimatedTime(questionnaire)
    : (isPersonalityFlow ? '--' : 0);
  const introSectionTitle = isPersonalityFlow ? '测评简介' : '量表简介';
  const selectedTesteeIndex = testeeList.findIndex(item => item.id === selectedTesteeId);
  const entryStatusText = resolveEntryStatusText(entryContext?.entry_status);
  const startDisabled = !selectedTesteeId || Boolean(entryStatusText);

  return (
    <>
      {/* 准备步骤：显示问卷信息和档案选择器 */}
      {currentStep === 'ready' && (
        <View className="fill-ready-page">
          <ScrollView scrollY className="fill-ready-scroll">
            {/* 问卷封面图 */}
            <View className="questionnaire-cover">
              <Image
                className="cover-image"
                src={questionnaire?.thumbnail || 'https://picsum.photos/400/400'}
                mode="aspectFill"
              />
            </View>

            {/* 问卷标题信息 */}
            <View className="questionnaire-header">
              <Text className="questionnaire-title">{readyTitle}</Text>
              {questionnaire?.subtitle && (
                <Text className="questionnaire-subtitle">{questionnaire.subtitle}</Text>
              )}
              
              <View className="questionnaire-meta">
                <View className="meta-item">
                  <Text className="meta-icon">📄</Text>
                  <Text className="meta-text">
                    {readyQuestionCount}道题
                  </Text>
                </View>
                <View className="meta-item">
                  <Text className="meta-icon">⏱</Text>
                  <Text className="meta-text">
                    预计{readyEstimatedTime}分钟
                  </Text>
                </View>
              </View>
            </View>

            {/* 档案选择区域 */}
            <View className="testee-selector-section">
              <Text className="section-title">选择档案</Text>
              {testeeList.length > 0 ? (
                <View className="testee-selector">
                  <Picker
                    mode="selector"
                    range={testeePickerOptions}
                    rangeKey="label"
                    value={selectedTesteeIndex >= 0 ? selectedTesteeIndex : 0}
                    onChange={(e) => {
                      const selectedIndex = e.detail.value;
                      const selectedTestee = testeeList[selectedIndex];
                      if (selectedTestee) {
                        handleTesteeChange(selectedTestee.id);
                      }
                    }}
                  >
                    <View className="testee-picker">
                      <Text className="testee-picker-label">
                        {selectedTesteeId && testeeInfo 
                          ? (testeeInfo.legalName || testeeInfo.name || '未命名')
                          : '请选择档案'}
                      </Text>
                      <Text className="testee-picker-arrow">▼</Text>
                    </View>
                  </Picker>
                  
                  {/* 显示选中的档案信息 */}
                  {testeeInfo && (
                    <View className="testee-info-card">
                      <View className="testee-info-item">
                        <Text className="testee-info-label">姓名</Text>
                        <Text className="testee-info-value">{testeeInfo.legalName || testeeInfo.name || '未命名'}</Text>
                      </View>
                      <View className="testee-info-item">
                        <Text className="testee-info-label">性别</Text>
                        <Text className="testee-info-value">
                          {testeeInfo.gender === 1 ? "男" : testeeInfo.gender === 2 ? "女" : "其他"}
                        </Text>
                      </View>
                      {testeeInfo.birthday && (
                        <View className="testee-info-item">
                          <Text className="testee-info-label">出生日期</Text>
                          <Text className="testee-info-value">{testeeInfo.birthday}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View className="testee-empty">
                  <Text className="testee-empty-text">暂无档案</Text>
                  <View className="testee-add-button" onClick={handleAddChild}>
                    <Text className="testee-add-button-text">+ 添加档案</Text>
                  </View>
                </View>
              )}
            </View>

            {hasEntryContext(entryContext) && (
              <View className="entry-context-section">
                <Text className="section-title">当前入口来源</Text>
                <View className="entry-context-card">
                  {entryContext?.entry_title && (
                    <Text className="entry-context-title">{entryContext.entry_title}</Text>
                  )}
                  {entryContext?.clinician_name && (
                    <Text className="entry-context-meta">
                      {entryContext.clinician_name}
                      {entryContext.clinician_title ? ` · ${entryContext.clinician_title}` : ''}
                    </Text>
                  )}
                  {entryContext?.entry_description && (
                    <Text className="entry-context-desc">{entryContext.entry_description}</Text>
                  )}
                  {(entryContext?.target_type || entryContext?.target_code) && (
                    <Text className="entry-context-target">
                      {entryContext.target_type || 'questionnaire'}
                      {entryContext.target_code ? ` · ${entryContext.target_code}` : ''}
                    </Text>
                  )}
                  {entryStatusText && (
                    <View className="entry-context-warning">
                      <Text className="entry-context-warning-text">{entryStatusText}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 量表简介 */}
            <View className="questionnaire-intro-section">
              <Text className="section-title">{introSectionTitle}</Text>
              <Text className="intro-content">
                {questionnaire?.introduction || questionnaire?.description || 
                `${readyTitle || '本测评'}将帮助你了解相关人格特质。完成答题后，系统将生成专属解读报告。`}
              </Text>
            </View>

            {/* 底部占位 */}
            <View className="bottom-placeholder" />
          </ScrollView>

          {/* 底部固定按钮 */}
          <View className="fill-ready-footer">
            <View 
              className={`start-button ${startDisabled ? 'disabled' : ''}`}
              onClick={handleStartFill}
            >
              <Text className="button-text">{entryStatusText || '开始测评'}</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* 填写步骤：问卷填写页面 */}
      {currentStep === 'filling' && (
        <>
          {isSinglePage ? (
            <SinglePageQuestionnaire
              questionnaireCode={questionnaireCode}
              initialQuestionnaire={questionnaire}
              submitContract={submitContract}
              subSignid={subSignid}
              writedCallback={writedCallback}
              canSubmit={canSubmit}
              variant={isPersonalityFlow ? "personality" : "default"}
            />
          ) : (
            <QuestionnaireForm
              questionnaireCode={questionnaireCode}
              initialQuestionnaire={questionnaire}
              submitContract={submitContract}
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
