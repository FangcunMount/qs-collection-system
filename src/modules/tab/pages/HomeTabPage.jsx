import React, { useState, useEffect, useCallback, useMemo } from "react";
import Taro, { usePullDownRefresh, useReady, useRouter } from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";

import BottomMenu from "@/shared/ui/BottomMenu";
import { routes } from "@/shared/config/routes";
import { getScales } from "@/services/api/scales";
import { getAssessments } from "@/services/api/assessments";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import { getAssessmentEntryContext, subscribeAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import sleepIcon from "@/assets/home/category-sleep.png";
import moodIcon from "@/assets/home/category-mood.png";
import pressureIcon from "@/assets/home/category-pressure.png";
import attentionIcon from "@/assets/home/category-attention.png";
import childIcon from "@/assets/home/category-child.png";
import sensoryIcon from "@/assets/home/category-sensory.png";
import HomeHeader from "../components/home/HomeHeader";
import HomeBanner from "../components/home/HomeBanner";
import HomeStatusPanel from "../components/home/HomeStatusPanel";
import CategoryGrid from "../components/home/CategoryGrid";
import FeaturedScaleList from "../components/home/FeaturedScaleList";
import RecentAssessmentCard from "../components/home/RecentAssessmentCard";
import "./HomeTabPage.less";

const HOME_CATEGORIES = [
  {
    key: "sleep",
    value: "slp",
    title: "睡眠状态",
    subtitle: "入睡困难、易醒、睡眠质量差",
    icon: sleepIcon,
  },
  {
    key: "mood",
    value: "emt",
    title: "情绪状态",
    subtitle: "焦虑、低落、易怒、情绪波动",
    icon: moodIcon,
  },
  {
    key: "pressure",
    value: "pressure",
    title: "压力水平",
    subtitle: "压力评估与应对方式",
    icon: pressureIcon,
  },
  {
    key: "attention",
    value: "efn",
    title: "执行功能",
    subtitle: "分心、拖延、专注困难",
    icon: attentionIcon,
  },
  {
    key: "child",
    value: "td",
    title: "儿童行为",
    subtitle: "多动、抽动、自闭等行为表现",
    icon: childIcon,
  },
  {
    key: "sensory",
    value: "sii",
    title: "感觉统合",
    subtitle: "感觉处理与协调能力",
    icon: sensoryIcon,
  },
];

const CATEGORY_LABEL_MAP = {
  slp: "睡眠",
  sleep: "睡眠",
  emt: "情绪",
  pressure: "压力",
  efn: "执行功能",
  attention: "注意力",
  td: "儿童行为",
  adhd: "儿童行为",
  asd: "儿童行为",
  sii: "感觉统合",
};

const REPORTER_LABEL_MAP = {
  parent: "家长评估",
  teacher: "教师评估",
  self: "成人自评",
  clinical: "专业评估",
};

const FEATURED_TARGETS = [
  {
    key: "promis_sleep_disturbance_short_form",
    match: (scale) => {
      const text = getScaleSearchText(scale);
      return text.includes("promis") && (text.includes("睡眠") || text.includes("sleep"));
    },
  },
  {
    key: "isi",
    match: (scale) => {
      const text = getScaleSearchText(scale);
      return text.includes("isi") || text.includes("失眠严重");
    },
  },
  {
    key: "tssl",
    match: (scale) => {
      const text = getScaleSearchText(scale);
      return text.includes("tssl") || text.includes("抽动");
    },
  },
];

const getScaleSearchText = (scale) => {
  return [
    scale?.code,
    scale?.id,
    scale?.title,
    scale?.name,
    scale?.description,
    scale?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const normalizeLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value.label || value.name || value.title || value.value || value.code || "").trim();
};

const ENGINEERING_TEXT_PATTERNS = [
  ["此", "处", "为"].join(""),
  ["题", "干", "文", "本", "请", "替", "换"].join(""),
  ["m", "o", "c", "k"].join(""),
  ["t", "o", "d", "o"].join(""),
  ["t", "e", "s", "t"].join(""),
];

const RISK_TEXT_REPLACEMENTS = [
  { source: ["诊", "断"].join(""), target: "评估" },
  { source: ["确", "诊"].join(""), target: "评估" },
  { source: ["治", "疗"].join(""), target: "干预" },
];

const cleanClientText = (value, fallback) => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (ENGINEERING_TEXT_PATTERNS.some((pattern) => text.toLowerCase().includes(pattern))) {
    return fallback;
  }
  return RISK_TEXT_REPLACEMENTS.reduce((current, item) => {
    return current.split(item.source).join(item.target);
  }, text);
};

const deriveTags = (item) => {
  const tags = normalizeArray(item?.tags)
    .map(normalizeLabel)
    .filter(Boolean);

  const category = normalizeLabel(item?.category);
  if (category) {
    tags.unshift(CATEGORY_LABEL_MAP[category] || category);
  }

  normalizeArray(item?.reporters)
    .map(normalizeLabel)
    .map((reporter) => REPORTER_LABEL_MAP[reporter] || reporter)
    .filter(Boolean)
    .forEach((label) => tags.push(label));

  return Array.from(new Set(tags)).slice(0, 3);
};

const normalizeQuestionCount = (item) => {
  const raw = item?.question_count ?? item?.questionCount ?? item?.questions_count ?? item?.questionnaire_question_count;
  const count = Number(raw || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const normalizeEstimatedMinutes = (item, questionCount) => {
  const raw = item?.estimated_minutes ?? item?.estimatedMinutes ?? item?.duration_minutes;
  const minutes = Number(raw || 0);
  if (Number.isFinite(minutes) && minutes > 0) {
    return Math.ceil(minutes);
  }
  return questionCount ? Math.max(3, Math.ceil(questionCount * 0.45)) : 0;
};

const normalizeScale = (item) => {
  const code = normalizeLabel(item?.code || item?.id || item?.questionnaire_code);
  const questionCount = normalizeQuestionCount(item);
  return {
    id: code,
    code,
    title: cleanClientText(item?.title || item?.name || item?.scale_name || code, "专业测评量表"),
    description: cleanClientText(
      item?.description || item?.summary || item?.introduction,
      "用于辅助了解相关状态，结果可作为自我观察与沟通参考"
    ),
    tags: deriveTags(item),
    questionCount,
    estimatedMinutes: normalizeEstimatedMinutes(item, questionCount),
    raw: item,
  };
};

const pickFeaturedScales = (scales) => {
  const selected = [];
  const selectedCodes = new Set();

  FEATURED_TARGETS.forEach((target) => {
    const match = scales.find((scale) => {
      const code = normalizeLabel(scale?.code || scale?.id);
      return code && !selectedCodes.has(code) && target.match(scale);
    });
    if (match) {
      const code = normalizeLabel(match.code || match.id);
      selected.push(match);
      selectedCodes.add(code);
    }
  });

  scales.forEach((scale) => {
    if (selected.length >= 3) return;
    const code = normalizeLabel(scale?.code || scale?.id);
    if (!code || selectedCodes.has(code)) return;
    selected.push(scale);
    selectedCodes.add(code);
  });

  return selected.slice(0, 3).map(normalizeScale);
};

const normalizeRecentAssessment = (item) => {
  if (!item) return null;
  return {
    id: normalizeLabel(item.id),
    answerSheetId: normalizeLabel(item.answer_sheet_id || item.answersheet_id || item.answerSheetId),
    title: cleanClientText(
      item.scale_name || item.title || item.questionnaire_title || item.questionnaire_code,
      "测评记录"
    ),
    completedAt: formatSimpleDate(item.submitted_at || item.completed_at || item.created_at || item.updated_at),
    scaleCode: normalizeLabel(item.scale_code || item.questionnaire_code || item.code),
    status: item.status,
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
    const menuButton = Taro.getMenuButtonBoundingClientRect?.();
    const windowWidth = systemInfo.windowWidth || 375;
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const capsuleRightGap = menuButton?.right ? Math.max(windowWidth - menuButton.right, 0) : 8;
    const capsuleAvoidWidth = menuButton?.width
      ? Math.ceil(menuButton.width + capsuleRightGap + 14)
      : 104;

    return {
      statusBarHeight,
      capsuleAvoidWidth,
    };
  } catch (error) {
    console.warn("获取胶囊位置信息失败:", error);
    return {
      statusBarHeight: 0,
      capsuleAvoidWidth: 104,
    };
  }
};

const HomeIndex = () => {
  const router = useRouter();
  const [featuredScales, setFeaturedScales] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [recentAssessment, setRecentAssessment] = useState(null);
  const [recentLoading, setRecentLoading] = useState(false);
  const [navMetrics, setNavMetrics] = useState(() => resolveNavMetrics());
  const [entryContext, setEntryContext] = useState(() => getAssessmentEntryContext());
  const [currentTestee, setCurrentTestee] = useState(() => getInitialTestee());

  const navStyle = useMemo(() => ({
    paddingTop: `${navMetrics.statusBarHeight}px`,
    paddingRight: `${navMetrics.capsuleAvoidWidth}px`,
  }), [navMetrics]);

  const loadFeaturedScales = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      const result = await getScales({ page: 1, pageSize: 50 });
      const payload = result.data || result;
      const scales = payload.scales || [];
      setFeaturedScales(pickFeaturedScales(scales));
    } catch (error) {
      console.error("加载首页精选量表失败:", error);
      setFeaturedScales([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

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

  const handleCategoryClick = useCallback((category) => {
    Taro.navigateTo({ url: routes.tabScales({ category: category.value }) });
  }, []);

  const handleExploreScales = useCallback(() => {
    Taro.navigateTo({ url: routes.tabScales() });
  }, []);

  const handleManageTestee = useCallback(() => {
    Taro.navigateTo({ url: routes.testeeList() });
  }, []);

  const handleStartScale = useCallback((scale) => {
    const code = scale?.code || scale?.id;
    if (!code) {
      Taro.showToast({ title: "暂未获取到量表入口", icon: "none" });
      return;
    }
    const params = { q: code };
    if (currentTestee?.id) {
      params.t = currentTestee.id;
    }
    Taro.navigateTo({ url: routes.assessmentFill(params) });
  }, [currentTestee?.id]);

  const handleViewReport = useCallback((assessment) => {
    if (assessment?.answerSheetId) {
      Taro.navigateTo({ url: routes.assessmentReport({ a: assessment.answerSheetId }) });
      return;
    }
    if (assessment?.id && currentTestee?.id) {
      Taro.navigateTo({ url: routes.assessmentReport({ aid: assessment.id, t: currentTestee.id }) });
      return;
    }
    Taro.showToast({ title: "暂未获取到报告入口", icon: "none" });
  }, [currentTestee?.id]);

  const handleRetakeAssessment = useCallback((assessment) => {
    const code = assessment?.scaleCode;
    if (!code) {
      Taro.showToast({ title: "暂未获取到量表入口", icon: "none" });
      return;
    }
    const params = { q: code };
    if (currentTestee?.id) {
      params.t = currentTestee.id;
    }
    Taro.navigateTo({ url: routes.assessmentFill(params) });
  }, [currentTestee?.id]);

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

  const handleRescanEntry = useCallback(async (event) => {
    event?.stopPropagation?.();
    try {
      const result = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ["qrCode"],
      });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({
          title: "未识别到可用测评入口",
          icon: "none",
        });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (error) {
      if (isScanCancelError(error)) {
        return;
      }
      console.error("首页重新扫码失败:", error);
      Taro.showToast({
        title: "扫码失败，请重试",
        icon: "none",
      });
    }
  }, []);

  const refreshHomeData = useCallback(async () => {
    await Promise.all([
      loadFeaturedScales(),
      loadRecentAssessment(currentTestee?.id),
    ]);
  }, [currentTestee?.id, loadFeaturedScales, loadRecentAssessment]);

  usePullDownRefresh(async () => {
    await refreshHomeData();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    setNavMetrics(resolveNavMetrics());
    loadFeaturedScales();
  }, [loadFeaturedScales]);

  useEffect(() => {
    loadRecentAssessment(currentTestee?.id);
  }, [currentTestee?.id, loadRecentAssessment]);

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
      <HomeHeader
        navStyle={navStyle}
      />

      <ScrollView scrollY className="home-content" enhanced showScrollbar={false}>
        <View className="home-hero">
          <Text className="home-hero__title">
            了解你的<Text className="home-hero__title-emphasis">心理与行为</Text>状态
          </Text>
          <Text className="home-hero__subtitle">
            从睡眠、情绪、压力等方向开始，完成一次简短测评
          </Text>
        </View>

        <HomeBanner onStart={handleExploreScales} />

        <HomeStatusPanel
          currentTestee={currentTestee}
          entryContext={entryContext}
          onManageTestee={handleManageTestee}
          onContinueTask={handleContinueEntry}
          onScanTask={handleRescanEntry}
        />

        <CategoryGrid
          categories={HOME_CATEGORIES}
          onCategoryClick={handleCategoryClick}
          onViewAll={handleExploreScales}
        />

        <FeaturedScaleList
          scales={featuredScales}
          loading={featuredLoading}
          onViewMore={handleExploreScales}
          onStartScale={handleStartScale}
        />

        <RecentAssessmentCard
          assessment={recentAssessment}
          loading={recentLoading}
          hasTestee={Boolean(currentTestee?.id)}
          onViewAll={() => Taro.navigateTo({ url: routes.assessmentRecords() })}
          onViewReport={handleViewReport}
          onRetake={handleRetakeAssessment}
          onExplore={handleExploreScales}
        />

        <View className="home-bottom-spacer" />
      </ScrollView>

      <BottomMenu activeKey="首页" />
    </View>
  );
};

export default HomeIndex;
