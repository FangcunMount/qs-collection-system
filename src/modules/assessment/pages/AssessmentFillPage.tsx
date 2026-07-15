import React, { useEffect, useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";

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
  resolveSubmitAssessmentKind,
} from "../lib/assessmentSubmitNavigation";
import {
  resolveQuestionnaireSinglePageMode,
  resolveTesteeBootstrap,
} from "../lib/assessmentFillFlow";
import { buildAssessmentReadyViewModel } from "../viewModels/assessmentReady";
import AssessmentReadyView from "../views/AssessmentReadyView";
import AssessmentAnsweringView from "../views/AssessmentAnsweringView";
import type {
  AssessmentSubmitContract,
  QuestionnaireData,
} from "@/modules/questionnaire/types";
import type { EntryContext } from "@/store/entryContextStore";
import type { Testee, TesteeInput } from "@/store/testeeStore";

const PAGE_NAME = "questionnaire_fill";
const logger = getLogger(PAGE_NAME);

type FillStep = "loading" | "ready" | "filling";
type RouteParams = Record<string, string | undefined>;

interface ResolvedFillEntry extends RouteParams {
  q?: string;
  mc?: string;
  model_code?: string;
  t?: string;
  testee_id?: string;
  signid?: string;
  sp?: string;
  entry_status?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { message?: unknown; errMsg?: unknown };
  return String(candidate.errMsg || candidate.message || fallback);
};

export default function AssessmentFillController() {
  const [questionnaireCode, setQuestionnaireCode] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [isPersonalityFlow, setIsPersonalityFlow] = useState(false);
  const [submitContract, setSubmitContract] = useState<AssessmentSubmitContract | null>(null);
  const [subSignid, setSubSignid] = useState("");
  
  // 状态管理
  const [currentStep, setCurrentStep] = useState<FillStep>("loading");
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [testeeInfo, setTesteeInfo] = useState<TesteeInput | null>(null);
  const [testeeList, setTesteeList] = useState<Testee[]>([]);
  const [selectedTesteeId, setSelectedTesteeIdState] = useState("");
  const [entryContext, setEntryContextState] = useState<EntryContext | null>(() => getAssessmentEntryContext());

  const canSubmit = true;
  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params as RouteParams;
  const entryParams = normalizeAssessmentEntryParams(paramData);
  const planTaskId = resolvePlanTaskId(paramData, entryContext);
  const fillAssessmentKind = resolveSubmitAssessmentKind({
    questionnaireType: questionnaire?.type,
    assessmentKind: entryParams.kind || submitContract?.assessment_kind,
    isPersonalityFlow,
  });
  const shouldDirectStartPersonality = (nextModelCode: string | null) => {
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

    Taro.showLoading({ title: "加载中", mask: true });

    resolveAssessmentFillEntryParams(paramData).then((rawResult: unknown) => {
      const result = rawResult as ResolvedFillEntry;
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

      const personalityModelCode = normalizedEntry.modelCode || null;
      const resolvedQuestionnaireCode = personalityModelCode
        ? null
        : (normalizedEntry.questionnaireCode || nextQuestionnaireCode || null);

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

      beforeEach(async () => {
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
  });

  useShareAppMessage(() => ({}));

  /**
   * 初始化页面数据
   * 1. 重新初始化 testee store
   * 2. 根据 testee 数量决定是否自动选择
   * 3. 加载问卷数据
   */
  const initPageData = async (
    nextQuestionnaireCode: string | null,
    nextModelCode: string | null,
    explicitTesteeId: string | undefined,
    resolvedEntryParams: ResolvedFillEntry,
  ): Promise<void> => {
    try {
      await refreshTesteeList();

      const storedList = getStoredTesteeList();
      const bootstrap = resolveTesteeBootstrap(storedList, explicitTesteeId);

      if (bootstrap.kind === "create_testee") {
        Taro.hideLoading();
        const params = {
          submitClose: "0",
          goUrl: ROUTES.assessmentFill,
          goParams: JSON.stringify(resolvedEntryParams || paramData)
        };
        Taro.redirectTo({ url: routes.testeeCreate(params) });
        return;
      }

      if (bootstrap.kind === "load_selected") {
        setSelectedTesteeId(bootstrap.testeeId);
        await loadAssessmentContent(nextQuestionnaireCode, nextModelCode, bootstrap.testeeId, resolvedEntryParams);
        return;
      }

      if (bootstrap.kind === "load_single") {
        setSelectedTesteeId(bootstrap.testeeId);
        await loadAssessmentContent(nextQuestionnaireCode, nextModelCode, bootstrap.testeeId, resolvedEntryParams);
      } else {
        setSelectedTesteeId("");
        setTesteeList(storedList);
        await loadAssessmentContentOnly(nextQuestionnaireCode, nextModelCode, resolvedEntryParams);
      }
    } catch (error) {
      console.error('初始化页面数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  const loadPersonalitySession = async (
    nextModelCode: string,
    testeeId: string,
  ): Promise<QuestionnaireData> => {
    const { questionnaireData, submitContract: nextSubmitContract } =
      await loadPersonalitySessionForFill({ modelCode: nextModelCode, testeeId });

    setSubmitContract(nextSubmitContract);
    return questionnaireData as QuestionnaireData;
  };

  const loadAssessmentContentOnly = async (
    nextQuestionnaireCode: string | null,
    nextModelCode: string | null,
    resolvedEntryParams: ResolvedFillEntry,
  ): Promise<void> => {
    try {
      if (nextModelCode) {
        setCurrentStep('ready');
        Taro.hideLoading();
        return;
      }
      if (!nextQuestionnaireCode) throw new Error("缺少问卷编码");

      const questionnaireData = await getQuestionnaire(nextQuestionnaireCode);
      setQuestionnaire(questionnaireData as QuestionnaireData);
      setCurrentStep('ready');
      Taro.hideLoading();
    } catch (error) {
      console.error('加载问卷失败:', error);
      Taro.hideLoading();
      if (hasEntryContext(resolvedEntryParams)) {
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

  const loadAssessmentContent = async (
    nextQuestionnaireCode: string | null,
    nextModelCode: string | null,
    testeeId: string,
    resolvedEntryParams: ResolvedFillEntry,
  ): Promise<void> => {
    try {
      if (!nextModelCode && !nextQuestionnaireCode) throw new Error("缺少问卷编码");
      const [questionnaireData, testeeData] = await Promise.all([
        nextModelCode
          ? loadPersonalitySession(nextModelCode, testeeId)
          : getQuestionnaire(nextQuestionnaireCode as string),
        getTestee(testeeId)
      ]);

      setQuestionnaire(questionnaireData as QuestionnaireData);
      setTesteeInfo(testeeData as TesteeInput);
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
      if (hasEntryContext(resolvedEntryParams) || nextModelCode) {
        redirectToEntryError({
          title: nextModelCode ? "人格测评暂不可用" : "入口内容暂不可用",
          text: nextModelCode
            ? getErrorMessage(error, "当前人格模型无法开始测评")
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
  const handleTesteeChange = async (testeeId: string): Promise<void> => {
    if (!testeeId) return;

    setSelectedTesteeId(testeeId);

    try {
      const testeeData = await getTestee(testeeId);
      setTesteeInfo(testeeData as TesteeInput);

      if (isPersonalityFlow && modelCode) {
        Taro.showLoading({ title: "加载中", mask: true });
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
        Taro.showLoading({ title: "加载中", mask: true });
        const questionnaireData = await loadPersonalitySession(modelCode, selectedTesteeId);
        setQuestionnaire(questionnaireData);
        Taro.hideLoading();
      } catch (error) {
        Taro.hideLoading();
        Taro.showToast({ title: getErrorMessage(error, '加载题版失败'), icon: 'none' });
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
        title: getErrorMessage(error, '订阅失败，请稍后重试'),
        icon: 'none'
      });
    }

    // 根据问卷类型和题目数量决定是否使用单页单题模式
    const questionCount = questionnaire?.questions?.length || 0;
    const questionnaireType = questionnaire?.type;
    const assessmentKind = resolveSubmitAssessmentKind({
      questionnaireType,
      assessmentKind: entryParams.kind || submitContract?.assessment_kind,
      isPersonalityFlow,
    });

    setSubmitContract((current) => ({
      ...(current || {}),
      questionnaire_code: current?.questionnaire_code || questionnaire?.code,
      questionnaire_version: current?.questionnaire_version || questionnaire?.version,
      testee_id: selectedTesteeId,
      model_code: current?.model_code || modelCode || undefined,
      assessment_kind: assessmentKind || current?.assessment_kind,
    }));

    setIsSinglePage(resolveQuestionnaireSinglePageMode({
      questionnaireType,
      questionCount,
      requestedSinglePage: isSinglePage,
      isPersonalityFlow,
    }));

    setCurrentStep('filling');
  };

  const beforeEach = async (next: () => Promise<void>): Promise<void> => {
    // 注意：signid 功能已废弃，不再支持通过 signid 查询答卷ID
    // 如果将来需要恢复此功能，需要后端提供新的 API 接口

    Taro.hideLoading();
    await next();
  };

  /**
   * 答卷提交成功回调
   */
  const writedCallback = async (
    answersheetid: string,
    assessmentId: string,
    requestId: string,
  ): Promise<void> => {
    const questionnaireType = questionnaire?.type;
    const selectedTesteeId = getSelectedTesteeId();
    const assessmentKind = resolveSubmitAssessmentKind({
      questionnaireType,
      assessmentKind: fillAssessmentKind || entryParams.kind || submitContract?.assessment_kind,
      isPersonalityFlow,
    });

    logger.RUN('[Fill] 答卷提交成功', {
      answersheetid,
      assessmentId,
      requestId,
      questionnaireType,
      assessmentKind,
      testeeId: selectedTesteeId,
      navigation: resolvePostSubmitNavigationKind({
        questionnaireType,
        isPersonalityFlow,
        assessmentKind,
      }),
    });

    if (
      !assessmentKind &&
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
        assessmentKind,
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

  const entryStatusText = resolveEntryStatusText(entryContext?.entry_status);
  const readyViewModel = buildAssessmentReadyViewModel({
    questionnaire,
    testees: testeeList,
    selectedTesteeId: selectedTesteeId || '',
    selectedTestee: testeeInfo,
    entryContext,
    entryStatusText,
    isPersonality: isPersonalityFlow,
  });

  return (
    <>
      {currentStep === 'ready' && (
        <AssessmentReadyView
          viewModel={readyViewModel}
          onSelectTestee={handleTesteeChange}
          onAddTestee={handleAddChild}
          onStart={handleStartFill}
        />
      )}
      
      {currentStep === 'filling' && (
        <AssessmentAnsweringView
          viewModel={{
            questionnaireCode,
            questionnaire,
            submitContract,
            subSignid,
            isSinglePage,
            isPersonality: isPersonalityFlow,
            canSubmit,
            onWritten: writedCallback,
          }}
        />
      )}

      <PrivacyAuthorization />
    </>
  );
}
