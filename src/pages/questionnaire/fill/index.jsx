import React, { useEffect, useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";
import { View, Text, Image, ScrollView, Picker } from "@tarojs/components";

import "./index.less";
import QuestionSheet from "./weight/questionsheet";
import SinglePageModel from "./weight/singlePageModel";
import { initTesteeStore, refreshTesteeList } from "../../../store/testeeStore.ts";

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
  subscribeTesteeStore,
  findTesteeById
} from "../../../store";
import { getValidQuestionCount, getEstimatedTime } from "../../common/utils/questionUtils";

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
  
  // 状态管理
  const [currentStep, setCurrentStep] = useState('loading'); // loading | ready | filling
  const [questionnaire, setQuestionnaire] = useState(null);
  const [testeeInfo, setTesteeInfo] = useState(null);
  const [testeeList, setTesteeList] = useState([]);
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(null);

  const canSubmit = true;
  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params;

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
        await initPageData(questionsheetCode, testeeid, result);
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
  const initPageData = async (questionsheetCode, explicitTesteeId, entryParams) => {
    try {
      // 重新初始化 testee store
      await refreshTesteeList();
      
      let storedList = getStoredTesteeList();
      
      // 如果没有档案
      if (!storedList.length) {
        Taro.hideLoading();
        const params = {
          submitClose: "0",
          goUrl: "/pages/questionnaire/fill/index",
          goParams: JSON.stringify(entryParams || paramData)
        };
        Taro.redirectTo({ url: paramsConcat("/pages/testee/register/index", params) });
        return;
      }

      // 如果有明确的 testeeid，使用它
      if (explicitTesteeId) {
        setSelectedTesteeId(explicitTesteeId);
        await loadQuestionnaire(questionsheetCode, explicitTesteeId);
        return;
      }

      // 根据档案数量决定是否自动选择
      if (storedList.length === 1) {
        // 只有一个档案，自动选择
        const singleTesteeId = storedList[0].id;
        setSelectedTesteeId(singleTesteeId);
        await loadQuestionnaire(questionsheetCode, singleTesteeId);
      } else {
        // 多个档案，清空选中状态，让用户选择
        setSelectedTesteeId(null);
        setTesteeList(storedList);
        // 加载问卷信息（不加载档案信息）
        await loadQuestionnaireOnly(questionsheetCode);
      }
    } catch (error) {
      console.error('初始化页面数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 只加载问卷信息（不加载档案信息）
   */
  const loadQuestionnaireOnly = async (questionsheetCode) => {
    try {
      const questionnaireData = await getQuestionnaire(questionsheetCode);
      setQuestionnaire(questionnaireData);
      setCurrentStep('ready'); // 进入准备步骤，等待用户选择档案
      Taro.hideLoading();
    } catch (error) {
      console.error('加载问卷失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载问卷失败，请重试', icon: 'none' });
    }
  };

  /**
   * 加载问卷和档案信息
   */
  const loadQuestionnaire = async (questionsheetCode, testeeId) => {
    try {
      // 并行加载问卷和档案信息
      const [questionnaireData, testeeData] = await Promise.all([
        getQuestionnaire(questionsheetCode),
        getTestee(testeeId)
      ]);

      setQuestionnaire(questionnaireData);
      setTesteeInfo(testeeData);
      setCurrentStep('ready'); // 进入准备步骤
      
      Taro.hideLoading();
    } catch (error) {
      console.error('加载数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 选择档案
   */
  const handleTesteeChange = async (testeeId) => {
    if (!testeeId) return;
    
    setSelectedTesteeId(testeeId);
    
    // 加载选中的档案信息
    try {
      const testeeData = await getTestee(testeeId);
      setTesteeInfo(testeeData);
    } catch (error) {
      console.error('加载档案信息失败:', error);
      Taro.showToast({ title: '加载档案信息失败', icon: 'none' });
    }
  };

  /**
   * 开始填写问卷
   */
  const handleStartFill = () => {
    if (!selectedTesteeId) {
      Taro.showToast({ title: '请先选择档案', icon: 'none' });
      return;
    }

    if (!testeeInfo) {
      Taro.showToast({ title: '档案信息加载中，请稍候', icon: 'none' });
      return;
    }

    // 根据问卷类型和题目数量决定是否使用单页单题模式
    const questionCount = questionnaire?.questions?.length || 0;
    const questionnaireType = questionnaire?.type;
    
    // 量表且题目数少于20时，使用单页单题模式
    if (questionnaireType === 'MedicalScale' && questionCount < 20 && !isSinglePage) {
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
      // 量表：先跳转到等待解析页面
      let finalAssessmentId = assessmentId;
      if (!finalAssessmentId) {
        logger.RUN('[Fill] 提交接口未返回 assessmentId，通过 answersheetId 获取', { 
          answersheetid 
        });
        finalAssessmentId = await getAssessmentIdByAnswersheetId(answersheetid);
      }

      if (finalAssessmentId) {
        const testeeIdParam = selectedTesteeId ? `&t=${selectedTesteeId}` : '';
        Taro.redirectTo({
          url: `/pages/analysis/wait/index?aid=${finalAssessmentId}&a=${answersheetid}${testeeIdParam}`
        });
      } else {
        logger.WARN('[Fill] 量表无法获取 assessmentId，直接跳转到解析页面', { 
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

  const handleAddChild = () => {
    const params = {
      submitClose: "0",
      goUrl: "/pages/questionnaire/fill/index",
      goParams: JSON.stringify(paramData)
    };
    Taro.redirectTo({ url: paramsConcat("/pages/testee/register/index", params) });
  };

  // 准备档案选择器的选项
  const testeePickerOptions = testeeList.map(item => ({
    label: item.legalName || item.name || '未命名',
    value: item.id
  }));

  const selectedTesteeIndex = testeeList.findIndex(item => item.id === selectedTesteeId);

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
              <Text className="questionnaire-title">{questionnaire?.title}</Text>
              {questionnaire?.subtitle && (
                <Text className="questionnaire-subtitle">{questionnaire.subtitle}</Text>
              )}
              
              <View className="questionnaire-meta">
                <View className="meta-item">
                  <Text className="meta-icon">📄</Text>
                  <Text className="meta-text">
                    {getValidQuestionCount(questionnaire?.questions) || 0}道题
                  </Text>
                </View>
                <View className="meta-item">
                  <Text className="meta-icon">⏱</Text>
                  <Text className="meta-text">
                    预计{getEstimatedTime(questionnaire)}分钟
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

            {/* 量表简介 */}
            <View className="questionnaire-intro-section">
              <Text className="section-title">量表简介</Text>
              <Text className="intro-content">
                {questionnaire?.introduction || questionnaire?.description || 
                `${questionnaire?.title || '本问卷'}是一个专业的心理测评工具，旨在帮助您了解自己在相关维度上的状况。通过完成问卷，您将获得详细的测评报告和专业的解读。`}
              </Text>
            </View>

            {/* 底部占位 */}
            <View className="bottom-placeholder" />
          </ScrollView>

          {/* 底部固定按钮 */}
          <View className="fill-ready-footer">
            <View 
              className={`start-button ${!selectedTesteeId ? 'disabled' : ''}`}
              onClick={handleStartFill}
            >
              <Text className="button-text">开始测评</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* 填写步骤：问卷填写页面 */}
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
