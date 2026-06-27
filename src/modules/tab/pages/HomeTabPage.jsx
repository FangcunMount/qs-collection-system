import React, { useState, useEffect, useCallback, useMemo } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import BottomMenu from "@/shared/ui/BottomMenu";
import { routes } from "@/shared/config/routes";
import { ASSESSMENT_PORTALS } from "@/shared/config/assessmentPortals";
import { getAssessments } from "@/services/api/assessments";
import { getHotScales } from "@/services/api/scales";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import { getAccountStoreState, initAccountStore, subscribeAccountStore } from "@/shared/stores/account";
import HomeHeader from "../components/home/HomeHeader";
import HomeCurrentProfileCard from "../components/home/HomeCurrentProfileCard";
import sleepQualityIcon from "@/assets/icon/icon-sleep-quality.png";
import "./HomeTabPage.less";

const PORTAL_ROUTE_RESOLVERS = {
  tabScales: () => routes.tabScales(),
  personalityCatalog: () => routes.personalityCatalog(),
  abilityCatalog: () => routes.abilityCatalog(),
};

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

const normalizeRecentAssessment = (item) => {
  if (!item) return null;
  return {
    id: normalizeLabel(item.id),
    answerSheetId: normalizeLabel(item.answer_sheet_id || item.answersheet_id || item.answerSheetId),
    title: resolveRecentAssessmentTitle(item),
    completedAt: formatSimpleDate(item.submitted_at || item.completed_at || item.created_at || item.updated_at),
    scaleCode: normalizeLabel(item.scale_code || item.questionnaire_code || item.code),
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

const formatHotScaleDuration = (scale) => {
  if (scale.duration) return scale.duration;
  if (scale.questionCount > 0) {
    return `约 ${Math.max(3, Math.ceil(scale.questionCount / 6))} 分钟`;
  }
  return "约 5 分钟";
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
  const [recentAssessment, setRecentAssessment] = useState(null);
  const [recentLoading, setRecentLoading] = useState(false);
  const [hotScales, setHotScales] = useState([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [navMetrics, setNavMetrics] = useState(() => resolveNavMetrics());
  const [entryContext, setEntryContext] = useState(() => getAssessmentEntryContext());
  const [currentTestee, setCurrentTestee] = useState(() => getInitialTestee());
  const [accountState, setAccountState] = useState(() => getAccountStoreState());

  const userName = accountState.userInfo?.name
    || accountState.userInfo?.nickname
    || getTesteeDisplayName(currentTestee);
  const userAvatar = accountState.userInfo?.picture
    || accountState.userInfo?.avatar
    || accountState.userInfo?.avatarUrl
    || accountState.userInfo?.headimgurl
    || "";
  const hasEntryTask = Boolean(entryContext?.q || entryContext?.target_code);

  const navStyle = useMemo(() => ({
    paddingTop: `${navMetrics.statusBarHeight}px`,
  }), [navMetrics]);

  const loadRecentAssessment = useCallback(async (testeeId) => {
    if (!testeeId) {
      setRecentAssessment(null);
      setRecentLoading(false);
      return;
    }

    try {
      setRecentLoading(true);
      const result = await getAssessments({ testeeId, page: 1, pageSize: 1 });
      const payload = result.data || result;
      const item = (payload.items || [])[0];
      setRecentAssessment(normalizeRecentAssessment(item));
    } catch (error) {
      console.error("加载最近测评失败:", error);
      setRecentAssessment(null);
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

  const handleManageTestee = useCallback(() => {
    Taro.navigateTo({ url: routes.testeeList() });
  }, []);

  const handleOpenPortal = useCallback((portal) => {
    const target = PORTAL_ROUTE_RESOLVERS[portal.routeKey];
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

  const handleContinueProfile = useCallback(() => {
    if (recentAssessment) {
      handleViewReport(recentAssessment);
      return;
    }
    Taro.navigateTo({ url: routes.tabScales() });
  }, [handleViewReport, recentAssessment]);

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

  const refreshHomeData = useCallback(async () => {
    await Promise.all([
      loadRecentAssessment(currentTestee?.id),
      loadHotScales(),
    ]);
  }, [currentTestee?.id, loadHotScales, loadRecentAssessment]);

  usePullDownRefresh(async () => {
    await refreshHomeData();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    setNavMetrics(resolveNavMetrics());
  }, []);

  useEffect(() => {
    loadRecentAssessment(currentTestee?.id);
    loadHotScales();
  }, [currentTestee?.id, loadHotScales, loadRecentAssessment]);

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
    const unsubscribeAccount = subscribeAccountStore((snapshot) => {
      setAccountState(snapshot);
    });

    const initState = getAccountStoreState();
    if (!initState.isInitialized && !initState.isLoading) {
      initAccountStore().catch((error) => {
        console.error("[HomeTabPage] 初始化用户数据失败:", error);
      });
    }

    return () => {
      unsubscribeEntry();
      unsubscribeTestee();
      unsubscribeAccount();
    };
  }, []);

  return (
    <View className="home-page">
      <HomeHeader
        navStyle={navStyle}
        userName={userName}
        userAvatar={userAvatar}
        onUserClick={handleManageTestee}
      />

      <ScrollView scrollY className="home-content" enhanced showScrollbar={false}>
        <HomeCurrentProfileCard
          currentTestee={currentTestee}
          recentAssessment={recentAssessment}
          recentLoading={recentLoading}
          onContinue={handleContinueProfile}
        />

        {hasEntryTask && (
          <View className="home-task-strip" onClick={handleContinueEntry}>
            <View className="home-task-strip__text">
              <Text className="home-task-strip__title">继续机构测评任务</Text>
              <Text className="home-task-strip__meta">已识别到可继续的扫码入口</Text>
            </View>
            <AtIcon value="chevron-right" size="16" color="#2F80ED" />
          </View>
        )}

        <View className="home-action-row">
          <View className="home-action-chip home-action-chip--records" onClick={handleViewRecords}>
            <View className="home-action-chip__icon">
              <AtIcon value="list" size="15" color="#2F80ED" />
            </View>
            <View className="home-action-chip__text">
              <Text className="home-action-chip__title">报告中心</Text>
              <Text className="home-action-chip__subtitle">查看历史结果</Text>
            </View>
          </View>
          <View className="home-action-chip home-action-chip--profile" onClick={handleManageTestee}>
            <View className="home-action-chip__icon">
              <AtIcon value="user" size="15" color="#12B886" />
            </View>
            <View className="home-action-chip__text">
              <Text className="home-action-chip__title">档案管理</Text>
              <Text className="home-action-chip__subtitle">切换受试人</Text>
            </View>
          </View>
        </View>

        <View className="home-section home-channel-section">
          <View className="home-section__header">
            <View className="home-section__title-wrap">
              <Text className="home-section__title">选择测评方向</Text>
              <Text className="home-section__subtitle">从严谨筛查、轻松探索到成长观察</Text>
            </View>
          </View>
          <View className="home-channel-grid">
            {ASSESSMENT_PORTALS.map((portal, index) => (
              <View
                key={portal.key}
                className={`home-channel-card home-channel-card--${portal.tone} ${index === 0 ? "home-channel-card--primary" : ""}`}
                onClick={() => handleOpenPortal(portal)}
              >
                <View className="home-channel-card__body">
                  <View className="home-channel-card__topline">
                    <View className="home-channel-card__icon">
                      <AtIcon value={portal.icon || "star"} size="15" color={portal.accentColor} />
                    </View>
                    <Text
                      className="home-channel-card__label"
                      style={{ color: portal.labelColor }}
                    >
                      {portal.badge}
                    </Text>
                  </View>
                  <Text className="home-channel-card__title">{portal.title}</Text>
                  <Text className="home-channel-card__headline">{portal.headline || portal.title}</Text>
                  <Text className="home-channel-card__subtitle">{portal.subtitle}</Text>
                  <View className="home-channel-card__action">
                    <Text className="home-channel-card__action-text">{portal.actionText}</Text>
                    <AtIcon value="chevron-right" size="18" color={portal.accentColor} />
                  </View>
                </View>
                <Image className="home-channel-card__image" src={portal.image} mode="aspectFit" />
              </View>
            ))}
          </View>
        </View>

        <View className="home-section home-hot-section">
          <View className="home-section__header">
            <View className="home-section__title-wrap">
              <Text className="home-section__title">推荐开始</Text>
              <Text className="home-section__subtitle">近期使用较多的专业量表</Text>
            </View>
            <View className="home-section__more" onClick={handleViewMoreHotScales}>
              <Text>查看更多</Text>
              <AtIcon value="chevron-right" size="14" color="#8A96AA" />
            </View>
          </View>
          <View className="home-hot-list">
            {hotLoading ? (
              <View className="home-hot-placeholder">
                <Text>正在加载热门量表...</Text>
              </View>
            ) : hotScales.length > 0 ? (
              hotScales.map((scale) => (
                <View
                  key={scale.code || scale.title}
                  className="home-hot-row"
                  onClick={() => handleStartHotScale(scale)}
                >
                  <Image className="home-hot-row__icon" src={sleepQualityIcon} mode="aspectFit" />
                  <View className="home-hot-row__content">
                    <Text className="home-hot-row__title">{scale.title}</Text>
                    <Text className="home-hot-row__desc">{scale.description}</Text>
                  </View>
                  <View className="home-hot-row__duration">
                    <Text>{formatHotScaleDuration(scale)}</Text>
                  </View>
                  <AtIcon value="chevron-right" size="18" color="#9AA6B8" />
                </View>
              ))
            ) : (
              <View className="home-hot-placeholder">
                <Text>暂无热门推荐，可前往量表页查看全部测评。</Text>
              </View>
            )}
          </View>
        </View>

        <View className="home-bottom-spacer" />
      </ScrollView>

      <BottomMenu activeKey="首页" />
    </View>
  );
};

function getTesteeDisplayName(testee) {
  if (!testee) return "我自己";
  return testee.legalName || testee.name || "我自己";
}

export default HomeIndex;
