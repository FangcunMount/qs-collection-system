import React, { useState, useEffect, useCallback, useMemo } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import BottomMenu from "@/shared/ui/BottomMenu";
import { routes } from "@/shared/config/routes";
import { ASSESSMENT_PORTALS } from "@/shared/config/assessmentPortals";
import { getAssessments } from "@/services/api/assessments";
import { getHotScales } from "@/services/api/scales";
import { parseDateSafe } from "@/shared/lib/dateFormatters";
import { getRiskConfig } from "@/shared/lib/statusFormatters";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import HomeHeader from "../components/home/HomeHeader";
import qlumeHeroBanner from "@/assets/banner/banner_3.webp";
import anxietyIcon from "@/assets/icon/icon-anxiety-screening.png";
import sleepQualityIcon from "@/assets/icon/icon-sleep-quality.png";
import attentionIcon from "@/assets/icon/icon-attention-screening.png";
import emotionIcon from "@/assets/icon/icon-emotion-state.png";
import "./HomeTabPage.less";

const PORTAL_ROUTE_RESOLVERS = {
  tabScales: () => routes.tabScales(),
  personalityCatalog: () => routes.personalityCatalog(),
  abilityCatalog: () => routes.abilityCatalog(),
};

const REPORT_ICONS = [anxietyIcon, sleepQualityIcon, attentionIcon];

const normalizeLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value.label || value.name || value.title || value.value || value.code || "").trim();
};

const resolveRecentAssessmentTitle = (item) => {
  const rawTitle = normalizeLabel(
    item.scale_name
    || item.title
    || item.questionnaire_title
    || item.questionnaire_code,
  ) || "测评记录";
  const marker = rawTitle.toUpperCase();

  if (marker.includes("MBTI")) {
    return "16 人格测评";
  }
  if (marker.includes("SBTI")) {
    return "SBTI 趣味小测试";
  }
  return rawTitle;
};

const formatDateTime = (value) => {
  if (!value) return "时间待同步";
  try {
    const date = parseDateSafe(String(value));
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
    const pad = (num) => `${num}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch (error) {
    return String(value).slice(0, 16).replace("T", " ");
  }
};

const resolveRiskTone = (riskLevel) => {
  const raw = String(riskLevel || "").toLowerCase();
  if (raw.includes("high") || raw.includes("severe") || raw.includes("critical")) return "high";
  if (raw.includes("medium") || raw.includes("mid") || raw.includes("moderate")) return "medium";
  if (raw.includes("low") || raw.includes("mild")) return "low";
  return "normal";
};

const resolveRiskLabel = (riskLevel) => {
  const tone = resolveRiskTone(riskLevel);
  if (tone === "high") return "偏高";
  if (tone === "medium") return "中等偏高";
  if (tone === "low") return "良好";
  return "良好";
};

const normalizeRecentAssessment = (item, index = 0) => {
  if (!item) return null;
  const riskLevel = item.risk_level || item.riskLevel || "";
  const riskConfig = getRiskConfig(riskLevel || "normal");
  const score = item.total_score ?? item.score ?? item.raw_score;
  const numericScore = Number(score);
  const categoryTag = normalizeLabel(item.stage_label || item.category_name || item.scale_category);
  return {
    id: normalizeLabel(item.id),
    answerSheetId: normalizeLabel(item.answer_sheet_id || item.answersheet_id || item.answerSheetId),
    title: resolveRecentAssessmentTitle(item),
    completedAt: formatDateTime(item.submitted_at || item.completed_at || item.created_at || item.updated_at),
    scaleCode: normalizeLabel(item.scale_code || item.questionnaire_code || item.code),
    tag: categoryTag || (resolveRiskTone(riskLevel) === "normal" ? "健康状态" : riskConfig.label) || "健康状态",
    score: score === undefined || score === null || score === "" || Number.isNaN(numericScore) ? "" : Math.round(numericScore),
    riskLevel,
    riskTone: resolveRiskTone(riskLevel),
    riskLabel: resolveRiskLabel(riskLevel),
    icon: REPORT_ICONS[index % REPORT_ICONS.length],
    status: item.status,
    raw: item,
  };
};

const normalizeHotScale = (item) => {
  if (!item) return null;
  return {
    code: normalizeLabel(item.code || item.scale_code || item.questionnaire_code),
    title: normalizeLabel(item.title || item.name || item.scale_name) || "热门量表",
    description: normalizeLabel(item.description) || "了解近期状态，辅助自我观察与沟通参考",
    questionCount: Number(item.question_count || item.questionCount || 0),
    duration: normalizeLabel(item.duration || item.estimated_duration || item.estimatedDuration),
    raw: item,
  };
};

const getInitialTestee = () => {
  const selectedId = getSelectedTesteeId();
  return selectedId ? findTesteeById(selectedId) : null;
};

const resolveNavMetrics = () => {
  try {
    const systemInfo = Taro.getSystemInfoSync?.() || {};

    return {
      statusBarHeight: systemInfo.statusBarHeight || 0,
    };
  } catch (error) {
    console.warn("获取胶囊位置信息失败:", error);
    return {
      statusBarHeight: 0,
    };
  }
};

const HomeIndex = () => {
  const router = useRouter();
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [hotScales, setHotScales] = useState([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [navMetrics, setNavMetrics] = useState(() => resolveNavMetrics());
  const [entryContext, setEntryContext] = useState(() => getAssessmentEntryContext());
  const [currentTestee, setCurrentTestee] = useState(() => getInitialTestee());

  const hasEntryTask = Boolean(entryContext?.q || entryContext?.target_code);
  const featuredScale = hotScales[0] || null;

  const navStyle = useMemo(() => ({
    paddingTop: `${navMetrics.statusBarHeight}px`,
  }), [navMetrics]);

  const loadRecentAssessments = useCallback(async (testeeId) => {
    if (!testeeId) {
      setRecentAssessments([]);
      setRecentLoading(false);
      return;
    }

    try {
      setRecentLoading(true);
      const result = await getAssessments({ testeeId, page: 1, pageSize: 3 });
      const payload = result.data || result;
      const list = (payload.items || [])
        .map((item, index) => normalizeRecentAssessment(item, index))
        .filter(Boolean);
      setRecentAssessments(list);
    } catch (error) {
      console.error("加载最近测评失败:", error);
      setRecentAssessments([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const loadHotScales = useCallback(async () => {
    try {
      setHotLoading(true);
      const result = await getHotScales({ limit: 3, windowDays: 30 });
      const payload = result.data || result;
      const list = (payload.scales || [])
        .map(normalizeHotScale)
        .filter(Boolean);
      setHotScales(list);
    } catch (error) {
      console.error("加载首页热门量表失败:", error);
      setHotScales([]);
    } finally {
      setHotLoading(false);
    }
  }, []);

  const handleDirectEntryRedirect = useCallback((params) => {
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

  const handleOpenPortal = useCallback((portal) => {
    const target = PORTAL_ROUTE_RESOLVERS[portal?.routeKey];
    if (!target) {
      Taro.showToast({ title: "入口暂未开放", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: target() });
  }, []);

  const handleViewReport = useCallback((assessment) => {
    if (assessment?.answerSheetId) {
      Taro.navigateTo({ url: routes.assessmentReport({ a: assessment.answerSheetId }) });
      return;
    }
    if (assessment?.id && currentTestee?.id) {
      Taro.navigateTo({ url: routes.assessmentReport({ aid: assessment.id, t: currentTestee.id }) });
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
    const params = {
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

  const handleStartHotScale = useCallback((scale) => {
    const code = scale?.code;
    if (!code) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    const params = { q: code };
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
    const portalMap = ASSESSMENT_PORTALS.reduce((acc, portal) => {
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
    setNavMetrics(resolveNavMetrics());
  }, []);

  useEffect(() => {
    loadRecentAssessments(currentTestee?.id);
    loadHotScales();
  }, [currentTestee?.id, loadHotScales, loadRecentAssessments]);

  useReady(() => {
    handleDirectEntryRedirect(router.params || {});
  });

  useEffect(() => {
    const unsubscribeEntry = subscribeAssessmentEntryContext((snapshot) => {
      setEntryContext(snapshot);
    });
    const unsubscribeTestee = subscribeTesteeStore(({ selectedTesteeId }) => {
      setCurrentTestee(selectedTesteeId ? findTesteeById(selectedTesteeId) : null);
    });

    return () => {
      unsubscribeEntry();
      unsubscribeTestee();
    };
  }, []);

  return (
    <View className="home-page">
      <HomeHeader navStyle={navStyle} />

      <ScrollView scrollY className="home-content" enhanced showScrollbar={false}>
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
            <View
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
            </View>
          ))}
        </View>

        <View className="home-panel home-reports-panel">
          <View className="home-section__header">
            <Text className="home-section__title">最近测评报告</Text>
            <View className="home-section__more" onClick={handleViewRecords}>
              <Text>查看全部</Text>
              <AtIcon value="chevron-right" size="14" color="#7B849A" />
            </View>
          </View>

          <View className="home-report-list">
            {recentLoading ? (
              <View className="home-empty-row">
                <Text>正在同步最近报告...</Text>
              </View>
            ) : recentAssessments.length > 0 ? (
              recentAssessments.map((assessment, index) => (
                <View
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
                </View>
              ))
            ) : (
              <View className="home-empty-row" onClick={handleStartExplore}>
                <Text>暂无测评报告，先开始一次科学测评。</Text>
              </View>
            )}
          </View>
        </View>

        <View className="home-panel home-daily-panel">
          <View className="home-section__header">
            <Text className="home-section__title">今日推荐</Text>
            <View className="home-section__more" onClick={handleViewMoreHotScales}>
              <Text>查看更多</Text>
              <AtIcon value="chevron-right" size="14" color="#7B849A" />
            </View>
          </View>

          <View className="home-daily-card" onClick={handleDailyRecord}>
            <Image className="home-daily-card__icon" src={emotionIcon} mode="aspectFit" />
            <View className="home-daily-card__body">
              <Text className="home-daily-card__title">
                {featuredScale?.title || "每日心情打卡"}
              </Text>
              <Text className="home-daily-card__desc">
                {hotLoading ? "正在获取今日推荐..." : (featuredScale?.description || "记录心情，关注心理健康")}
              </Text>
            </View>
            <View className="home-daily-card__button">
              <Text>{featuredScale ? "开始" : "去记录"}</Text>
            </View>
          </View>
        </View>

        <View className="home-bottom-spacer" />
      </ScrollView>

      <BottomMenu activeKey="首页" />
    </View>
  );
};

export default HomeIndex;
