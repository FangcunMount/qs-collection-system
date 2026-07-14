import React, { useState, useEffect, useCallback, useMemo } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import BottomMenu from "@/shared/ui/BottomMenu";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { ASSESSMENT_PORTALS } from "@/shared/config/assessmentPortals";
import { loadRecentAssessments as fetchRecentAssessments } from "@/modules/assessment/services/loadRecentAssessments";
import { listHotPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import { mapMedicalCatalogCard, type CatalogCardViewModel } from "@/modules/catalog/viewModels/catalogCard";
import { mapRecentAssessment, type RecentAssessmentViewModel } from "@/modules/tab/viewModels/home";
import qlumeHeroBanner from "@/assets/banner/banner_3.webp";
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

interface TesteeSummary {
  id?: string;
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
  const [currentTestee, setCurrentTestee] = useState<TesteeSummary | null>(() => getInitialTestee());

  const hasEntryTask = Boolean(entryContext?.q || entryContext?.target_code);
  const featuredScale = hotScales[0] || null;

  const loadRecentAssessments = useCallback(async (testeeId?: string) => {
    if (!testeeId) {
      setRecentAssessments([]);
      setRecentLoading(false);
      return;
    }

    try {
      setRecentLoading(true);
      setRecentError("");
      const source: unknown[] = await fetchRecentAssessments(testeeId, { pageSize: 3 });
      const list = source
        .map((item, index) => mapRecentAssessment(item, index, REPORT_ICONS))
        .filter((item): item is RecentAssessmentViewModel => Boolean(item));
      setRecentAssessments(list);
    } catch (error) {
      console.error("加载最近测评失败:", error);
      setRecentAssessments([]);
      setRecentError("最近报告同步失败，请稍后重试。");
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const loadHotScales = useCallback(async () => {
    try {
      setHotLoading(true);
      setHotError("");
      const result = await listHotPublishedAssessmentModels();
      const payload = result.data || result;
      const models: unknown[] = Array.isArray(payload.models) ? payload.models : [];
      const list = models.map(mapMedicalCatalogCard);
      setHotScales(list);
    } catch (error) {
      console.error("加载首页热门量表失败:", error);
      setHotScales([]);
      setHotError("今日推荐加载失败，请稍后重试。");
    } finally {
      setHotLoading(false);
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
    if (!code) {
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
    Taro.showToast({ title: "心情记录功能即将开放", icon: "none" });
  }, [featuredScale, handleStartHotScale]);

  const portalEntries = useMemo(() => {
    const portalMap = (ASSESSMENT_PORTALS as unknown as readonly PortalConfig[]).reduce<Record<string, PortalConfig>>((acc, portal) => {
      acc[portal.key] = portal;
      return acc;
    }, {});

    return [
      {
        key: "personality",
        title: "人格探索",
        desc: "16 人格 · 性格特质",
        icon: "star",
        image: portalMap.personality?.image,
        tone: "personality",
        onClick: () => handleOpenPortal(portalMap.personality),
      },
      {
        key: "ability",
        title: "行为能力",
        desc: "执行功能 · 行为潜能",
        icon: "analytics",
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
    loadHotScales();
  }, [currentTestee?.id, loadHotScales, loadRecentAssessments]);

  useReady(() => {
    handleDirectEntryRedirect((router.params || {}) as Record<string, unknown>);
  });

  useEffect(() => {
    const unsubscribeEntry = subscribeAssessmentEntryContext((snapshot: EntryContext | null) => {
      setEntryContext(snapshot);
    });
    const unsubscribeTestee = subscribeTesteeStore(({ selectedTesteeId }: { selectedTesteeId?: string }) => {
      setCurrentTestee(selectedTesteeId ? findTesteeById(selectedTesteeId) : null);
    });

    return () => {
      unsubscribeEntry();
      unsubscribeTestee();
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
          <Text className="home-welcome__title">Hi，欢迎来到 Qlume</Text>
          <Text className="home-welcome__subtitle">科学测评 · 专业解读 · 成长陪伴</Text>
        </View>

        <View className="home-hero" onClick={handleStartExplore}>
          <Image className="home-hero__banner" src={qlumeHeroBanner} mode="aspectFill" />
        </View>

        {hasEntryTask && (
          <View className="home-task-strip" onClick={handleContinueEntry}>
            <View className="home-task-strip__text">
              <Text className="home-task-strip__title">继续机构测评任务</Text>
              <Text className="home-task-strip__meta">已识别到可继续的扫码入口</Text>
            </View>
            <AtIcon value="chevron-right" size="16" color="#3F5DFF" />
          </View>
        )}

        <View className="home-portal">
          {portalEntries.map((entry) => (
            <SurfaceCard
              key={entry.key}
              className={`home-portal-card home-portal-card--${entry.tone}`}
              onClick={entry.onClick}
            >
              <View className="home-portal-card__icon">
                <AtIcon value={entry.icon} size="28" color="#FFFFFF" />
              </View>
              <View className="home-portal-card__body">
                <Text className="home-portal-card__title">{entry.title}</Text>
                <Text className="home-portal-card__desc">{entry.desc}</Text>
              </View>
              {entry.image && (
                <Image
                  className="home-portal-card__art"
                  src={entry.image}
                  mode="aspectFit"
                />
              )}
            </SurfaceCard>
          ))}
        </View>

        <View className="home-panel home-reports-panel">
          <SectionHeader
            title="最近测评报告"
            actionLabel="查看全部"
            onAction={handleViewRecords}
            className="home-section__header"
          />

          <View className="home-report-list">
            {recentLoading ? (
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
              recentAssessments.map((assessment, index) => (
                <SurfaceCard
                  key={assessment.answerSheetId || assessment.id || assessment.title}
                  className={`home-report-row home-report-row--${assessment.riskTone}`}
                  onClick={() => handleViewReport(assessment)}
                >
                  <View className={`home-report-row__icon home-report-row__icon--${index % REPORT_ICONS.length}`}>
                    <Image className="home-report-row__image" src={assessment.icon} mode="aspectFit" />
                  </View>
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
                  <AtIcon value="chevron-right" size="18" color="#B4BED0" />
                </SurfaceCard>
              ))
            ) : (
              <StatePanel
                state="empty"
                title="暂无测评报告"
                description="先开始一次科学测评。"
                actionText="开始探索"
                onAction={handleStartExplore}
                compact
              />
            )}
          </View>
        </View>

        <View className="home-panel home-daily-panel">
          <SectionHeader
            title="今日推荐"
            actionLabel="查看更多"
            onAction={handleViewMoreHotScales}
            className="home-section__header"
          />

          <SurfaceCard className="home-daily-card" onClick={handleDailyRecord}>
            <Image className="home-daily-card__icon" src={emotionIcon} mode="aspectFit" />
            <View className="home-daily-card__body">
              <Text className="home-daily-card__title">
                {featuredScale?.title || "每日心情打卡"}
              </Text>
              <Text className="home-daily-card__desc">
                {hotLoading
                  ? "正在获取今日推荐..."
                  : (hotError || featuredScale?.description || "记录心情，关注心理健康")}
              </Text>
            </View>
            <View className="home-daily-card__button">
              <Text>{featuredScale ? "开始" : "去记录"}</Text>
            </View>
          </SurfaceCard>
        </View>

        <View className="home-bottom-spacer" />
      </PageShell>
      <BottomMenu activeKey="首页" />
    </>
  );
};

export default HomeIndex;
