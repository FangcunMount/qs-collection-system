import React, { useState, useEffect, useCallback, useRef } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, Image, Picker } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";

import BottomMenu from "@/shared/ui/BottomMenu";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { loadRecentAssessments as fetchRecentAssessments } from "@/modules/assessment/services/loadRecentAssessments";
import { isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, getTesteeList, setSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import type { Testee } from "@/store/testeeStore";
import { mapRecentAssessment, type RecentAssessmentViewModel } from "@/modules/tab/viewModels/home";
import { resolveHomeSubject } from "../viewModels/homeSubject";
import adultMale from "@/assets/home/subjects/adult-male.webp";
import adultFemale from "@/assets/home/subjects/adult-female.webp";
import childMale from "@/assets/home/subjects/child-male.webp";
import childFemale from "@/assets/home/subjects/child-female.webp";
import emotionIcon from "@/assets/icon/icon-emotion-state.png";
import pressureIcon from "@/assets/icon/icon-anxiety-screening.png";
import sleepIcon from "@/assets/icon/icon-sleep-quality.png";
import attentionIcon from "@/assets/icon/icon-attention-screening.png";
import "./HomeTabPage.less";

const SUBJECT_IMAGES = { "adult-male": adultMale, "adult-female": adultFemale, "child-male": childMale, "child-female": childFemale };

interface EntryContext {
  q?: string;
  target_code?: string;
  task_id?: string;
  token?: string;
}

const getInitialTestee = () => {
  const selectedId = getSelectedTesteeId();
  return selectedId ? findTesteeById(selectedId) : null;
};

const HomeIndex = () => {
  const router = useRouter();
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessmentViewModel[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [entryContext, setEntryContext] = useState<EntryContext | null>(() => getAssessmentEntryContext());
  const [currentTestee, setCurrentTestee] = useState<Testee | null>(() => getInitialTestee());
  const [testees, setTestees] = useState<Testee[]>(() => getTesteeList());
  const selectedMemberId = useRef(currentTestee?.id || "");
  const recentRequest = useRef(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const hasEntryTask = Boolean(entryContext?.q || entryContext?.target_code);
  const subject = resolveHomeSubject(currentTestee);
  const avatar = subject.avatarKey === "neutral" ? "" : SUBJECT_IMAGES[subject.avatarKey];
  useEffect(() => { setAvatarFailed(false); }, [avatar]);

  const loadRecentAssessments = useCallback(async (testeeId?: string) => {
    const request = ++recentRequest.current;
    setRecentAssessments([]);
    setRecentError("");
    if (!testeeId) {
      setRecentAssessments([]);
      setRecentLoading(false);
      return;
    }

    try {
      setRecentLoading(true);
      setRecentError("");
      const source: unknown[] = await fetchRecentAssessments(testeeId, { pageSize: 3 });
      if (request !== recentRequest.current) return;
      const list = source
        .map((item, index) => mapRecentAssessment(item, index, []))
        .filter((item): item is RecentAssessmentViewModel => Boolean(item));
      setRecentAssessments(list);
    } catch (error) {
      if (request !== recentRequest.current) return;
      console.error("加载最近测评失败:", error);
      setRecentAssessments([]);
      setRecentError("最近报告同步失败，请稍后重试。");
    } finally {
      if (request === recentRequest.current) setRecentLoading(false);
    }
  }, []);

  const handleDirectEntryRedirect = useCallback((params: Record<string, unknown>) => {
    const scene = String(params?.scene || "").trim();
    const token = String(params?.token || "").trim();
    if (!scene && !token) {
      return false;
    }

    const targetUrl = token
      ? routes.assessmentFill({ token })
      : routes.assessmentFill({ scene });

    Taro.redirectTo({ url: targetUrl });
    return true;
  }, []);

  const handleViewReport = useCallback((assessment: RecentAssessmentViewModel) => {
    const assessmentKind = assessment?.assessmentKind;
    const reportRoute = isPersonalityAssessmentKind(assessmentKind)
      ? routes.personalityReport
      : routes.assessmentReport;
    const testeeId = assessment?.testeeId || currentTestee?.id;
    if ((assessment?.answerSheetId || assessment?.id) && testeeId) {
      Taro.navigateTo({
        url: reportRoute({
          a: assessment.answerSheetId || undefined,
          aid: assessment.id || undefined,
          t: testeeId,
          kind: assessmentKind || undefined,
        }),
      });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentRecords() });
  }, [currentTestee?.id]);

  const handleContinueEntry = useCallback(() => {
    const nextCode = entryContext?.q || entryContext?.target_code;
    if (!nextCode) return;
    const params: Record<string, string | undefined> = {
      q: nextCode,
      t: currentTestee?.id,
    };
    if (entryContext?.task_id) {
      params.task_id = entryContext.task_id;
    }
    if (entryContext?.token) {
      params.token = entryContext.token;
    }
    Taro.navigateTo({ url: routes.assessmentFill(params) });
  }, [currentTestee?.id, entryContext]);

  const handleViewRecords = useCallback(() => {
    Taro.navigateTo({ url: routes.assessmentRecords() });
  }, []);

  const openAllServices = async () => {
    try {
      const result = await Taro.showActionSheet({ itemList: ["医学量表", "人格探索", "行为能力"] });
      const destinations = [routes.tabScales(), routes.personalityCatalog(), routes.abilityCatalog()];
      if (destinations[result.tapIndex]) Taro.navigateTo({ url: destinations[result.tapIndex] });
    } catch (_) { /* Dismissing the native menu leaves the home unchanged. */ }
  };
  const services = subject.age === null ? [
    { key: "medical", title: "医学量表", desc: "了解当下状态", image: emotionIcon, icon: "list", tone: "mint", url: routes.tabScales() },
    { key: "personality", title: "人格探索", desc: "发现自己的特点", icon: "user", tone: "sand", url: routes.personalityCatalog() },
    { key: "ability", title: "行为能力", desc: "理解日常行为", icon: "chart", tone: "peach", url: routes.abilityCatalog() },
    { key: "sleep", title: "睡眠", desc: "关注休息与精力", image: sleepIcon, icon: "clock", tone: "lavender", url: routes.scaleList({ category: "slp" }) },
  ] : subject.isChild ? [
    { key: "mood", title: "情绪感受", desc: "留意孩子的情绪变化", image: emotionIcon, icon: "user", tone: "mint", url: routes.scaleList({ category: "emt" }) },
    { key: "sleep", title: "睡眠习惯", desc: "了解休息与作息", image: sleepIcon, icon: "clock", tone: "lavender", url: routes.scaleList({ category: "slp" }) },
    { key: "attention", title: "注意与专注", desc: "观察日常专注表现", image: attentionIcon, icon: "search", tone: "blue", url: routes.scaleList({ category: "adhd" }) },
    { key: "ability", title: "行为能力", desc: "理解行为背后的能力", icon: "chart", tone: "sand", url: routes.abilityCatalog() },
  ] : [
    { key: "mood", title: "心理健康", desc: "了解近期的感受", image: emotionIcon, icon: "user", tone: "mint", url: routes.scaleList({ category: "emt" }) },
    { key: "pressure", title: "压力", desc: "梳理压力与负荷", image: pressureIcon, icon: "notes", tone: "peach", url: routes.scaleList({ category: "pressure" }) },
    { key: "sleep", title: "睡眠", desc: "关注休息与精力", image: sleepIcon, icon: "clock", tone: "lavender", url: routes.scaleList({ category: "slp" }) },
    { key: "personality", title: "人格探索", desc: "发现自己的特点", icon: "user", tone: "sand", url: routes.personalityCatalog() },
  ];

  usePullDownRefresh(async () => {
    await loadRecentAssessments(currentTestee?.id);
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadRecentAssessments(currentTestee?.id);
  }, [currentTestee?.id, loadRecentAssessments]);


  useReady(() => {
    handleDirectEntryRedirect((router.params || {}) as Record<string, unknown>);
  });

  useEffect(() => {
    const unsubscribeEntry = subscribeAssessmentEntryContext((snapshot: EntryContext | null) => {
      setEntryContext(snapshot);
    });
    const unsubscribeTestee = subscribeTesteeStore(({ selectedTesteeId }: { selectedTesteeId?: string }) => {
      // Invalidate old member responses before the next render/effect.
      if (selectedMemberId.current !== (selectedTesteeId || "")) {
        selectedMemberId.current = selectedTesteeId || "";
        ++recentRequest.current;
        setRecentAssessments([]);
        setRecentError("");
        setRecentLoading(Boolean(selectedTesteeId));
      }
      setTestees(getTesteeList());
      setCurrentTestee(selectedTesteeId ? findTesteeById(selectedTesteeId) : null);
    });

    return () => {
      unsubscribeEntry();
      unsubscribeTestee();
      ++recentRequest.current;

    };
  }, []);

  const memberIdentity = <View className="home-member" hoverClass="home-member--pressed">
    <View className="home-member__avatar"><Icon name="user" size={24} /></View>
    <View className="home-member__identity"><Text className="home-member__name">{subject.name}</Text><Text className="home-member__meta">{subject.meta}</Text></View>
    <Text className="home-member__action">{currentTestee ? "切换受试者" : "选择受试者"} ⌄</Text>
  </View>;

  return <>
    <PageShell className="home-page" contentClassName="home-content" bottomInset={false}
      navigation={<AppNavigationBar brandTitle="Qlume" className="home-navigation" transparent />}>
      {testees.length ? <Picker mode="selector"
        range={[...testees.map(testee => testee.legalName || "未命名成员"), "添加 / 管理家庭成员"]}
        value={Math.max(0, testees.findIndex(testee => testee.id === currentTestee?.id))}
        onChange={event => {
          const testee = testees[Number(event.detail.value)];
          if (testee) setSelectedTesteeId(testee.id);
          else Taro.navigateTo({ url: routes.testeeList() });
        }}>{memberIdentity}</Picker>
        : <View onClick={() => Taro.navigateTo({ url: routes.testeeList() })}>{memberIdentity}</View>}

      {hasEntryTask ? <View className="home-task-strip" onClick={handleContinueEntry}>
        <View><Text className="home-task-strip__title">查看机构测评任务</Text><Text className="home-task-strip__meta">已识别扫码入口，进入后确认任务状态</Text></View>
        <Icon name="arrow-right" size={18} />
      </View> : null}

      <View className="home-welcome"><Text className="home-welcome__title">{subject.title}</Text><Text className="home-welcome__subtitle">{subject.subtitle}</Text></View>
      <View className="home-stage">
        <View className="home-stage__platform" />
        {avatar && !avatarFailed ? <Image className="home-stage__figure" src={avatar} mode="aspectFit" onError={() => setAvatarFailed(true)} />
          : <View className="home-stage__neutral" onClick={() => avatarFailed ? setAvatarFailed(false) : Taro.navigateTo({ url: routes.testeeList() })}><Icon name="user" size={90} /><Text>{avatarFailed ? "形象未加载，点击重试" : currentTestee ? "完善资料后展示对应形象" : "为自己或家人建立档案"}</Text></View>}
        <View className="home-stage__bubble"><Text>{subject.prompt}</Text></View>
      </View>

      <View className="home-services-heading"><Text>从关心的事开始</Text><View className="home-services-heading__more" onClick={openAllServices}>全部服务 ›</View></View>
      <View className="home-services">{services.map(service => <SurfaceCard key={service.key}
        className={`home-service home-service--${service.tone}`} onClick={() => Taro.navigateTo({ url: service.url })}>
        {service.image ? <Image className="home-service__icon" src={service.image} mode="aspectFit" /> : <View className="home-service__symbol"><Icon name={service.icon as "user" | "chart"} size={30} /></View>}
        <View className="home-service__body"><Text className="home-service__title">{service.title}</Text><Text className="home-service__description">{service.desc}</Text></View>
      </SurfaceCard>)}</View>

      <SurfaceCard className="home-records-link" onClick={handleViewRecords}><Icon name="records" size={22} /><Text className="home-records-link__title">评估记录</Text><Text>查看记录 ›</Text></SurfaceCard>
      {currentTestee ? <>
        <View className="home-recent-toggle" onClick={() => setShowReports(value => !value)}><Text>最近医学报告</Text><Text>{showReports ? "收起 ⌃" : "展开 ⌄"}</Text></View>
        {showReports ? <View className="home-report-list">
          {recentLoading ? <StatePanel state="loading" title="正在同步最近报告" compact />
            : recentError ? <StatePanel state="error" title="最近报告同步失败" description={recentError} actionText="重新加载" onAction={() => loadRecentAssessments(currentTestee.id)} compact />
            : recentAssessments.length ? recentAssessments.map(assessment => <SurfaceCard key={assessment.id || assessment.answerSheetId} className="home-report-row" onClick={() => handleViewReport(assessment)}>
              <View><Text className="home-report-row__title">{assessment.title}</Text><Text className="home-report-row__time">{assessment.completedAt}</Text></View><Icon name="arrow-right" size={18} />
            </SurfaceCard>) : <StatePanel state="empty" title="该成员暂无医学报告" description="完成医学量表后可在这里查看。" compact />}
        </View> : null}
      </> : null}
      <Text className="home-disclaimer">量表适用范围以具体说明为准</Text>
    </PageShell>
    <BottomMenu activeKey="首页" />
  </>;
};

export default HomeIndex;
