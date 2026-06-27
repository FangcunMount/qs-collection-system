import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import BottomMenu from "@/shared/ui/BottomMenu";
import SearchBox from "@/shared/ui/SearchBox";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES } from "@/shared/config/scaleCatalogHome";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { getScales, getHotScales } from "@/services/api/scales";
import { getLogger } from "@/shared/lib/logger";
import medicalHeroImage from "@/assets/home/home-entry-medical-scale.png";
import medicalTrustImage from "@/assets/home/home-current-record-checklist.png";
import categorySleepImage from "@/assets/home/category-sleep.png";
import categoryMoodImage from "@/assets/home/category-mood.png";
import categoryPressureImage from "@/assets/home/category-pressure.png";
import categoryAttentionImage from "@/assets/home/category-attention.png";
import categoryChildImage from "@/assets/home/category-child.png";
import categorySensoryImage from "@/assets/home/category-sensory.png";
import "./ScaleCatalogPage.less";

const PAGE_NAME = "questionnaire_list";
const logger = getLogger(PAGE_NAME);

const CATEGORY_IMAGES = {
  sleep: categorySleepImage,
  mood: categoryMoodImage,
  pressure: categoryPressureImage,
  attention: categoryAttentionImage,
  child: categoryChildImage,
  sensory: categorySensoryImage,
};

const QUICK_ACTIONS = Object.freeze([
  { key: "quick", title: "快速评估", subtitle: "精选量表", icon: "add-circle", color: "#2F80ED" },
  { key: "favorite", title: "我的收藏", subtitle: "常用量表", icon: "star", color: "#FF6B82" },
  { key: "records", title: "评估记录", subtitle: "历史记录", icon: "list", color: "#24C28A" },
  { key: "profile", title: "健康档案", subtitle: "综合管理", icon: "user", color: "#7957F2" },
]);

const normalizeLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value.label || value.name || value.title || value.value || value.code || "").trim();
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags.map(normalizeLabel).filter(Boolean);
};

const normalizeScale = (item) => ({
  code: normalizeLabel(item.code || item.scale_code || item.questionnaire_code),
  name: normalizeLabel(item.title || item.name || item.scale_name) || "医学量表",
  description: normalizeLabel(item.description) || "了解近期状态，辅助自我观察与沟通参考。",
  category: normalizeLabel(item.category),
  stages: item.stages || [],
  applicableAges: item.applicable_ages || [],
  reporters: item.reporters || [],
  tags: normalizeTags(item.tags),
  question_count: Number(item.question_count || item.questionCount || 0),
  status: item.status,
});

const formatDuration = (scale) => {
  if (scale?.question_count > 0) {
    return `约 ${Math.max(3, Math.ceil(scale.question_count / 6))} 分钟`;
  }
  return "约 5 分钟";
};

const resolveCategoryImage = (category) => CATEGORY_IMAGES[category.key] || categorySleepImage;

const resolveScaleImage = (scale) => {
  const marker = [
    scale?.name,
    scale?.description,
    scale?.category,
    ...(scale?.tags || []),
  ].join(" ");

  if (/睡眠|入睡|失眠|sleep/i.test(marker)) return categorySleepImage;
  if (/儿童|行为|家长|child|parent/i.test(marker)) return categoryChildImage;
  if (/压力|压力量表|PSS|stress/i.test(marker)) return categoryPressureImage;
  if (/执行|注意|专注|ADHD|SNAP|attention/i.test(marker)) return categoryAttentionImage;
  if (/感觉|统合|sensory/i.test(marker)) return categorySensoryImage;
  if (/情绪|焦虑|抑郁|GAD|PHQ|mood|anxiety/i.test(marker)) return categoryMoodImage;
  return categorySleepImage;
};

const resolveHeaderMetrics = () => {
  try {
    const systemInfo = Taro.getSystemInfoSync?.() || {};
    return {
      statusBarHeight: systemInfo.statusBarHeight || 0,
    };
  } catch (error) {
    console.warn("[ScaleCatalogPage] 获取状态栏高度失败:", error);
    return { statusBarHeight: 0 };
  }
};

const ScaleCatalogPage = () => {
  const [scaleList, setScaleList] = useState([]);
  const [hotScales, setHotScales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hotLoading, setHotLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showScaleResults, setShowScaleResults] = useState(false);
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });
  const [isParamsReady, setIsParamsReady] = useState(false);

  const loadScaleList = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(true);
      const result = await getScales({
        page,
        pageSize: 20,
        title: searchText,
        category: selectedCategory,
      });
      const payload = result.data || result;
      const scales = (payload.scales || []).map(normalizeScale);

      setScaleList((prev) => (append ? [...prev, ...scales] : scales));
      setPagination({
        page: payload.page || page,
        page_size: payload.page_size || 20,
        total: payload.total || 0,
        total_pages: payload.total_pages || 0,
      });
    } catch (error) {
      console.error("加载量表列表失败:", error);
      Taro.showToast({
        title: "加载失败，请重试",
        icon: "none",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedCategory]);

  const loadHotScales = useCallback(async () => {
    try {
      setHotLoading(true);
      const result = await getHotScales({ limit: 3, windowDays: 30 });
      const payload = result.data || result;
      setHotScales((payload.scales || []).map(normalizeScale));
    } catch (error) {
      console.error("加载热门量表失败:", error);
      setHotScales([]);
    } finally {
      setHotLoading(false);
    }
  }, []);

  usePullDownRefresh(async () => {
    await Promise.all([
      loadHotScales(),
      showScaleResults ? loadScaleList(1, false) : Promise.resolve(),
    ]);
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    setNavMetrics(resolveHeaderMetrics());
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) {
      setSearchText(params.keyword);
      setShowScaleResults(true);
    }
    if (params.category) {
      setSelectedCategory(params.category);
      setShowScaleResults(true);
    }
    setIsParamsReady(true);
  }, []);

  useEffect(() => {
    loadHotScales();
  }, [loadHotScales]);

  useEffect(() => {
    if (isParamsReady && showScaleResults) {
      loadScaleList(1, false);
    }
  }, [isParamsReady, showScaleResults, loadScaleList]);

  const handleSearch = useCallback(() => {
    setSelectedCategory(null);
    setShowScaleResults(true);
  }, []);

  const handleScaleClick = useCallback((scale) => {
    logger.RUN("点击量表", scale);
    if (!scale?.code) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
  }, []);

  const handleCategoryGridClick = useCallback((category) => {
    setSelectedCategory(category.value);
    setSearchText("");
    setShowScaleResults(true);
  }, []);

  const handleViewAllCategories = useCallback(() => {
    setSelectedCategory(null);
    setSearchText("");
    setShowScaleResults(true);
  }, []);

  const handleScanEntry = useCallback(async () => {
    try {
      const result = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ["qrCode"],
      });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({ title: "未识别到可用测评入口", icon: "none" });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (error) {
      if (isScanCancelError(error)) {
        return;
      }
      console.error("[ScaleCatalogPage] 扫码失败:", error);
      Taro.showToast({ title: "扫码失败，请重试", icon: "none" });
    }
  }, []);

  const handleViewMoreHotScales = useCallback(() => {
    setSelectedCategory(null);
    setSearchText("");
    setShowScaleResults(true);
  }, []);

  const handleQuickAction = useCallback((key) => {
    if (key === "quick") {
      handleScanEntry();
      return;
    }
    if (key === "records") {
      Taro.navigateTo({ url: routes.assessmentRecords() });
      return;
    }
    if (key === "profile") {
      Taro.navigateTo({ url: routes.testeeList() });
      return;
    }
    Taro.showToast({ title: "收藏功能即将开放", icon: "none" });
  }, [handleScanEntry]);

  const handleLoadMore = () => {
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({ title: "没有更多量表了", icon: "none" });
      return;
    }
    loadScaleList(pagination.page + 1, true);
  };

  return (
    <>
      <View className="scale-page">
        <ScrollView scrollY className="scale-page__scroll" enhanced showScrollbar={false}>
          <View
            className="scale-page__header"
            style={{ paddingTop: `${navMetrics.statusBarHeight}px` }}
          >
            <Text className="scale-page__title">医学量表</Text>
            <Text className="scale-page__subtitle">
              科学评估身心健康，了解自己，从专业量表开始
            </Text>
          </View>

          <View className="scale-page__search">
            <SearchBox
              className="scale-search-box"
              placeholder="搜索量表名称、关键词"
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
              onConfirm={handleSearch}
              iconColor="#8A96AA"
              iconSize={18}
            />
          </View>

          <View className="scale-hero">
            <View className="scale-hero__content">
              <Text className="scale-hero__title">专业筛查{"\n"}与状态评估</Text>
              <Text className="scale-hero__desc">
                从睡眠、情绪、压力到儿童行为，按场景快速找到合适量表
              </Text>
              <View className="scale-hero__button" onClick={handleViewMoreHotScales}>
                <Text>开始评估</Text>
                <AtIcon value="arrow-right" size="15" color="#FFFFFF" />
              </View>
            </View>
            <Image className="scale-hero__image" src={medicalHeroImage} mode="aspectFit" />
          </View>

          <View className="scale-quick-panel">
            {QUICK_ACTIONS.map((action, index) => (
              <View
                key={action.key}
                className="scale-quick-item"
                onClick={() => handleQuickAction(action.key)}
              >
                <View className="scale-quick-item__icon" style={{ color: action.color }}>
                  <AtIcon value={action.icon} size="24" color={action.color} />
                </View>
                <Text className="scale-quick-item__title">{action.title}</Text>
                <Text className="scale-quick-item__subtitle">{action.subtitle}</Text>
                {index < QUICK_ACTIONS.length - 1 && <View className="scale-quick-item__divider" />}
              </View>
            ))}
          </View>

          <View className="scale-section">
            <View className="scale-section__header">
              <Text className="scale-section__title">常用分类</Text>
              <View className="scale-section__more" onClick={handleViewAllCategories}>
                <Text>全部分类</Text>
                <AtIcon value="chevron-right" size="14" color="#8A96AA" />
              </View>
            </View>
            <View className="scale-category-grid">
              {SCALE_COMMON_CATEGORIES.map((category) => (
                <View
                  key={category.key}
                  className={`scale-category-card ${selectedCategory === category.value ? "is-active" : ""}`}
                  onClick={() => handleCategoryGridClick(category)}
                >
                  <Image
                    className="scale-category-card__image"
                    src={resolveCategoryImage(category)}
                    mode="aspectFit"
                  />
                  <View className="scale-category-card__text">
                    <Text className="scale-category-card__title">{category.title}</Text>
                    <Text className="scale-category-card__subtitle">{category.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="scale-section">
            <View className="scale-section__header">
              <Text className="scale-section__title">热门量表</Text>
              <View className="scale-section__more" onClick={handleViewMoreHotScales}>
                <Text>查看更多</Text>
                <AtIcon value="chevron-right" size="14" color="#8A96AA" />
              </View>
            </View>
            <View className="scale-hot-list">
              {hotLoading ? (
                <View className="scale-placeholder">
                  <Text>正在加载热门量表...</Text>
                </View>
              ) : hotScales.length > 0 ? (
                hotScales.map((scale) => (
                  <View
                    key={scale.code || scale.name}
                    className="scale-hot-row"
                    onClick={() => handleScaleClick(scale)}
                  >
                    <Image className="scale-hot-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                    <View className="scale-hot-row__content">
                      <View className="scale-hot-row__title-line">
                        <Text className="scale-hot-row__title">{scale.name}</Text>
                        <Text className="scale-hot-row__tag">
                          {scale.tags[0] || formatDuration(scale)}
                        </Text>
                      </View>
                      <Text className="scale-hot-row__desc">{scale.description}</Text>
                    </View>
                    <AtIcon value="chevron-right" size="18" color="#9AA6B8" />
                  </View>
                ))
              ) : (
                <View className="scale-placeholder">
                  <Text>暂无热门量表，可通过搜索查看全部测评。</Text>
                </View>
              )}
            </View>
          </View>

          {showScaleResults && (
            <View className="scale-section scale-result-section">
              <View className="scale-section__header">
                <Text className="scale-section__title">全部量表</Text>
                <Text className="scale-result-section__count">
                  {pagination.total ? `${pagination.total} 个结果` : "筛选结果"}
                </Text>
              </View>
              <View className="scale-result-list">
                {loading && scaleList.length === 0 ? (
                  <View className="scale-placeholder">
                    <Text>正在加载量表...</Text>
                  </View>
                ) : scaleList.length > 0 ? (
                  <>
                    {scaleList.map((scale) => (
                      <View
                        key={scale.code || scale.name}
                        className="scale-result-row"
                        onClick={() => handleScaleClick(scale)}
                      >
                        <Image className="scale-result-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                        <View className="scale-result-row__content">
                          <Text className="scale-result-row__title">{scale.name}</Text>
                          <Text className="scale-result-row__desc">{scale.description}</Text>
                        </View>
                        <Text className="scale-result-row__duration">{formatDuration(scale)}</Text>
                      </View>
                    ))}
                    {pagination.page < pagination.total_pages && (
                      <View className="scale-load-more" onClick={handleLoadMore}>
                        <Text>加载更多</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View className="scale-placeholder">
                    <Text>暂无匹配量表，请换个关键词试试。</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View className="scale-trust-card">
            <View className="scale-trust-card__content">
              <Text className="scale-trust-card__title">专业可靠 · 科学严谨 · 隐私安全</Text>
              <Text className="scale-trust-card__desc">
                所有量表均来自权威来源，结果仅供参考
              </Text>
            </View>
            <Image className="scale-trust-card__image" src={medicalTrustImage} mode="aspectFit" />
          </View>

          <View className="scale-page__bottom-spacer" />
        </ScrollView>
      </View>

      <BottomMenu activeKey="量表" />
    </>
  );
};

export default ScaleCatalogPage;
