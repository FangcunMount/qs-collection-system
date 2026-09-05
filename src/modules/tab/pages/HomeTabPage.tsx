import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, Image, Picker } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";

import BottomMenu from "@/shared/ui/BottomMenu";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import ActionButton from "@/shared/ui/ActionButton";
import { routes } from "@/shared/config/routes";
import { ASSESSMENT_PORTALS } from "@/shared/config/assessmentPortals";
import { loadRecentAssessments as fetchRecentAssessments } from "@/modules/assessment/services/loadRecentAssessments";
import { listHotPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, getTesteeList, setSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import type { Testee } from "@/store/testeeStore";
import { mapMedicalCatalogCard, type CatalogCardViewModel } from "@/modules/catalog/viewModels/catalogCard";
import { mapRecentAssessment, type RecentAssessmentViewModel } from "@/modules/tab/viewModels/home";
import qlumeHeroBanner from "@/assets/hero/qlume-home-v2.webp";
import anxietyIcon from "@/assets/icon/icon-anxiety-screening.png";
import sleepQualityIcon from "@/assets/icon/icon-sleep-quality.png";
import attentionIcon from "@/assets/icon/icon-attention-screening.png";
import emotionIcon from "@/assets/icon/icon-emotion-state.png";
import "./HomeTabPage.less";

const PORTAL_ROUTE_RESOLVERS: Record<string, () => string> = {
  tabScales: () => routes.tabScales(),
  personalityCatalog: () => routes.personalityCatalog(),
  abilityCatalog: () => routes.abilityCatalog(),
};

const REPORT_ICONS = [anxietyIcon, sleepQualityIcon, attentionIcon];

interface EntryContext {
  q?: string;
  target_code?: string;
  task_id?: string;
  token?: string;
}

interface PortalConfig {
  key: string;
  routeKey?: string;
  image?: string;
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
  const [hotScales, setHotScales] = useState<CatalogCardViewModel[]>([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [hotError, setHotError] = useState("");
  const [entryContext, setEntryContext] = useState<EntryContext | null>(() => getAssessmentEntryContext());
  const [currentTestee, setCurrentTestee] = useState<Testee | null>(() => getInitialTestee());
  const [testees, setTestees] = useState<Testee[]>(() => getTesteeList());
  const selectedMemberId = useRef(currentTestee?.id || "");
  const recentRequest = useRef(0);
  const hotRequest = useRef(0);

  const hasEntryTask = Boolean(entryContext?.q || entryContext?.target_code);
  const featuredScale = hotScales[0] || null;

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
        .map((item, index) => mapRecentAssessment(item, index, REPORT_ICONS))
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

  const loadHotScales = useCallback(async () => {
    const request = ++hotRequest.current;
    try {
      setHotLoading(true);
      setHotError("");
      const result = await listHotPublishedAssessmentModels();
      if (request !== hotRequest.current) return;
      const payload = result.data || result;
      const models: unknown[] = Array.isArray(payload.models) ? payload.models : [];
      const list = models.map(mapMedicalCatalogCard);
      setHotScales(list);
    } catch (error) {
      if (request !== hotRequest.current) return;
      console.error("加载首页热门量表失败:", error);
      setHotScales([]);
      setHotError("暂时无法获取已发布测评，请重试。");
    } finally {
      if (request === hotRequest.current) setHotLoading(false);
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

  const handleOpenPortal = useCallback((portal?: PortalConfig) => {
    const target = portal?.routeKey ? PORTAL_ROUTE_RESOLVERS[portal.routeKey] : undefined;
    if (!target) {
      Taro.showToast({ title: "入口暂未开放", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: target() });
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

  const handleStartExplore = useCallback(() => {
    Taro.navigateTo({ url: routes.tabScales() });
  }, []);

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

  const handleViewMoreHotScales = useCallback(() => {
    Taro.navigateTo({ url: routes.tabScales() });
  }, []);

  const handleStartHotScale = useCallback((scale: CatalogCardViewModel) => {
    const code = scale?.code;
    if (!code || scale.disabled) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    const params: Record<string, string> = { q: code };
    if (currentTestee?.id) {
      params.t = currentTestee.id;
    }
    Taro.navigateTo({ url: routes.assessmentFill(params) });
  }, [currentTestee?.id]);

  const handleDailyRecord = useCallback(() => {
    if (featuredScale) {
      handleStartHotScale(featuredScale);
      return;
    }
  }, [featuredScale, handleStartHotScale]);

  const portalEntries = useMemo(() => {
    const portalMap = (ASSESSMENT_PORTALS as unknown as readonly PortalConfig[]).reduce<Record<string, PortalConfig>>((acc, portal) => {
      acc[portal.key] = portal;
      return acc;
    }, {});

    return [
      {
        key: "medical",
        title: "医学量表",
        desc: "了解当下状态",
        icon: "list",
        image: portalMap.medical?.image,
        tone: "medical",
        onClick: () => handleOpenPortal(portalMap.medical),
      },
      {
        key: "personality",
        title: "人格探索",
        desc: "认识性格倾向",
        icon: "star",
        image: portalMap.personality?.image,
        tone: "personality",
        onClick: () => handleOpenPortal(portalMap.personality),
      },
      {
        key: "ability",
        title: "行为能力",
        desc: "理解日常行为",
        icon: "chart",
        image: portalMap.ability?.image,
        tone: "ability",
        onClick: () => handleOpenPortal(portalMap.ability),
      },
    ];
  }, [handleOpenPortal]);

  const refreshHomeData = useCallback(async () => {
    await Promise.all([
      loadRecentAssessments(currentTestee?.id),
      loadHotScales(),
    ]);
  }, [currentTestee?.id, loadHotScales, loadRecentAssessments]);

  usePullDownRefresh(async () => {
    await refreshHomeData();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadRecentAssessments(currentTestee?.id);
  }, [currentTestee?.id, loadRecentAssessments]);

  useEffect(() => {
    loadHotScales();
  }, [loadHotScales]);

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
      ++hotRequest.current;
    };
  }, []);

  return (
    <>
      <PageShell
        className="home-page"
        contentClassName="home-content"
        bottomInset={false}
        navigation={<AppNavigationBar brandTitle="Qlume" transparent />}
      >
        <View className="home-welcome">
          <Text className="home-welcome__title">今天，想了解哪一方面？</Text>
          {testees.length ? (
            <Picker
              mode="selector"
              range={testees.map((testee) => ({ id: testee.id, label: testee.legalName || "未命名成员" }))}
              rangeKey="label"
              value={Math.max(0, testees.findIndex((testee) => testee.id === currentTestee?.id))}
              onChange={(event) => {
                const testee = testees[Number(event.detail.value)];
                if (testee) setSelectedTesteeId(testee.id);
              }}
            >
              <View className="home-member" hoverClass="home-member--pressed">
                <Text>当前成员 · {currentTestee?.legalName || "请选择成员"}</Text>
                <Text className="home-member__action">切换 ›</Text>
              </View>
            </Picker>
          ) : (
            <ActionButton variant="ghost" className="home-member-action" onClick={() => Taro.navigateTo({ url: routes.testeeList() })}>添加或选择家庭成员</ActionButton>
          )}
        </View>

        {hasEntryTask && (
          <View className="home-task-strip" onClick={handleContinueEntry}>
            <View className="home-task-strip__text">
              <Text className="home-task-strip__title">查看机构测评任务</Text>
              <Text className="home-task-strip__meta">已识别扫码入口，进入后确认任务状态</Text>
            </View>
            <Icon name="arrow-right" size={16} color="#6657D9" />
          </View>
        )}

        <View className="home-hero">
          <Image className="home-hero__banner" src={qlumeHeroBanner} mode="aspectFill" />
          <View className="home-hero__content">
            <Text className="home-hero__title">每一次了解，都是成长的开始</Text>
            <Text className="home-hero__subtitle">从适合的测评出发，理解自己与家人</Text>
          </View>
        </View>

        <View className="home-portal">
          {portalEntries.map((entry) => (
            <SurfaceCard
              key={entry.key}
              className={`home-portal-card home-portal-card--${entry.tone}`}
              onClick={entry.onClick}
            >
              {entry.image ? <Image className="home-portal-card__art" src={entry.image} mode="aspectFit" />
                : <Icon name={entry.icon as "star" | "chart" | "list"} size={28} />}
              <View className="home-portal-card__body">
                <Text className="home-portal-card__title">{entry.title}</Text>
                <Text className="home-portal-card__desc">{entry.desc}</Text>
              </View>
            </SurfaceCard>
          ))}
        </View>

        <View className="home-panel home-reports-panel">
          <SectionHeader
            title="最近医学报告"
            actionLabel="查看全部"
            onAction={handleViewRecords}
            className="home-section__header"
          />

          <View className="home-report-list">
            {!currentTestee ? (
              <StatePanel state="empty" title="先选择一位家庭成员" description="选择成员后，查看其医学测评报告。" actionText="管理家庭档案" onAction={() => Taro.navigateTo({ url: routes.testeeList() })} compact />
            ) : recentLoading ? (
              <StatePanel state="loading" title="正在同步最近报告" compact />
            ) : recentError ? (
              <StatePanel
                state="error"
                title="最近报告同步失败"
                description={recentError}
                actionText="重新加载"
                onAction={() => loadRecentAssessments(currentTestee?.id)}
                compact
              />
            ) : recentAssessments.length > 0 ? (
              recentAssessments.map((assessment) => (
                <SurfaceCard
                  key={assessment.answerSheetId || assessment.id || assessment.title}
                  className={`home-report-row home-report-row--${assessment.riskTone}`}
                  onClick={() => handleViewReport(assessment)}
                >
                  <View className="home-report-row__main">
                    <View className="home-report-row__title-line">
                      <Text className="home-report-row__title">{assessment.title}</Text>
                      <Text className="home-report-row__tag">{assessment.tag}</Text>
                    </View>
                    <Text className="home-report-row__time">完成时间：{assessment.completedAt}</Text>
                  </View>
                  <View className="home-report-row__result">
                    {assessment.score !== "" && (
                      <View className="home-report-row__score">
                        <Text className="home-report-row__score-num">{assessment.score}</Text>
                        <Text className="home-report-row__score-unit">分</Text>
                      </View>
                    )}
                    <Text className="home-report-row__risk">{assessment.riskLabel}</Text>
                  </View>
                  <Icon name="arrow-right" size={18} color="#8A96AA" />
                </SurfaceCard>
              ))
            ) : (
              <StatePanel
                state="empty"
                title="该成员暂无医学报告"
                description="完成医学量表后可在这里查看；人格与行为能力报告可在对应领域查看。"
                actionText="查找医学量表"
                onAction={handleStartExplore}
                compact
              />
            )}
          </View>
        </View>

        <View className="home-panel home-daily-panel">
          <SectionHeader
            title="已发布测评"
            actionLabel="查看更多"
            onAction={handleViewMoreHotScales}
            className="home-section__header"
          />

          {hotLoading ? (
            <StatePanel state="loading" title="正在加载测评" compact />
          ) : hotError ? (
            <StatePanel state="error" title="测评加载失败" description={hotError} actionText="重新加载" onAction={loadHotScales} compact />
          ) : featuredScale ? (
          <SurfaceCard className="home-daily-card" onClick={handleDailyRecord}>
            <Image className="home-daily-card__icon" src={emotionIcon} mode="aspectFit" />
            <View className="home-daily-card__body">
              <Text className="home-daily-card__title">
                {featuredScale.title}
              </Text>
              <Text className="home-daily-card__desc">
                {featuredScale.description}
              </Text>
            </View>
            <View className="home-daily-card__button">
              <Text>查看</Text>
            </View>
          </SurfaceCard>
          ) : <StatePanel state="empty" title="暂无推荐测评" description="可以前往目录查看已发布的医学量表。" actionText="查看量表" onAction={handleViewMoreHotScales} compact />}
        </View>

        <View className="home-bottom-spacer" />
      </PageShell>
      <BottomMenu activeKey="首页" />
    </>
  );
};

export default HomeIndex;
