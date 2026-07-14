import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import BottomMenu from "@/shared/ui/BottomMenu";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isVisibleInMedicalScaleCatalog } from "@/shared/config/scaleCatalogHome";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { listHotPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
import medicalHeroBanner from "@/pages/catalog-medical/assets/banner/banner_2.png";
import medicalTrustImage from "@/pages/catalog-medical/assets/home/home-current-record-checklist.png";
import categorySleepImage from "@/pages/catalog-medical/assets/home/category-sleep.png";
import categoryMoodImage from "@/pages/catalog-medical/assets/home/category-mood.png";
import categoryPressureImage from "@/pages/catalog-medical/assets/home/category-pressure.png";
import categoryAttentionImage from "@/pages/catalog-medical/assets/home/category-attention.png";
import categoryChildImage from "@/pages/catalog-medical/assets/home/category-child.png";
import categorySensoryImage from "@/pages/catalog-medical/assets/home/category-sensory.png";
import "./ScaleCatalogPage.less";

const PAGE_NAME = "questionnaire_list";
const logger = getLogger(PAGE_NAME);

const QUICK_ACTIONS = Object.freeze([
  { key: "quick", title: "扫码评估", subtitle: "机构入口", icon: "add-circle", color: "#2F80ED" },
  { key: "all", title: "全部量表", subtitle: "分类查找", icon: "search", color: "#7957F2" },
  { key: "records", title: "评估记录", subtitle: "历史记录", icon: "list", color: "#24C28A" },
  { key: "profile", title: "健康档案", subtitle: "综合管理", icon: "user", color: "#FF8A3A" },
]);

const CATEGORY_IMAGE_MAP = {
  sleep: categorySleepImage,
  mood: categoryMoodImage,
  pressure: categoryPressureImage,
  attention: categoryAttentionImage,
  child: categoryChildImage,
  sensory: categorySensoryImage,
};

const FEATURED_CATEGORIES = SCALE_COMMON_CATEGORIES.slice(0, 4);

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
  const [hotScales, setHotScales] = useState([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());

  const loadHotScales = useCallback(async () => {
    try {
      setHotLoading(true);
      const result = await listHotPublishedAssessmentModels();
	  const payload = result.data || result;
	  setHotScales((payload.models || []).map(normalizeScale).filter(
        (scale) => isVisibleInMedicalScaleCatalog(scale.category)
      ));
    } catch (error) {
      console.error("加载热门量表失败:", error);
      setHotScales([]);
    } finally {
      setHotLoading(false);
    }
  }, []);

  usePullDownRefresh(async () => {
    await loadHotScales();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    setNavMetrics(resolveHeaderMetrics());
  }, []);

  useEffect(() => {
    loadHotScales();
  }, [loadHotScales]);

  const handleOpenScaleList = useCallback((params) => {
    Taro.navigateTo({ url: routes.scaleList(params) });
  }, []);

  const handleScaleClick = useCallback((scale) => {
    logger.RUN("点击量表", scale);
    if (!scale?.code) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
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

  const handleQuickAction = useCallback((key) => {
    if (key === "quick") {
      handleScanEntry();
      return;
    }
    if (key === "all") {
      handleOpenScaleList();
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
    Taro.showToast({ title: "功能即将开放", icon: "none" });
  }, [handleScanEntry, handleOpenScaleList]);

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

          <View className="scale-hero" onClick={() => handleOpenScaleList()}>
            <Image className="scale-hero__banner" src={medicalHeroBanner} mode="aspectFill" />
          </View>

          <View className="scale-quick-panel">
            {QUICK_ACTIONS.map((action, index) => (
              <View
                key={action.key}
                className="scale-quick-item"
                onClick={() => handleQuickAction(action.key)}
              >
                <View className={`scale-quick-item__icon scale-quick-item__icon--${action.key}`}>
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
              <Text className="scale-section__title">量表分类</Text>
              <View className="scale-section__more" onClick={() => handleOpenScaleList()}>
                <Text>全部分类</Text>
                <AtIcon value="chevron-right" size="14" color="#8A96AA" />
              </View>
            </View>
            <View className="scale-cat-grid">
              {FEATURED_CATEGORIES.map((category) => (
                <View
                  key={category.key}
                  className={`scale-cat-card scale-cat-card--${category.key}`}
                  onClick={() => handleOpenScaleList({ category: category.value })}
                >
                  <View className="scale-cat-card__icon">
                    <Image
                      className="scale-cat-card__image"
                      src={CATEGORY_IMAGE_MAP[category.key]}
                      mode="aspectFit"
                    />
                  </View>
                  <View className="scale-cat-card__text">
                    <Text className="scale-cat-card__title">{category.title}</Text>
                    <Text className="scale-cat-card__subtitle">{category.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="scale-section">
            <View className="scale-section__header">
              <Text className="scale-section__title">热门量表</Text>
              <View className="scale-section__more" onClick={() => handleOpenScaleList()}>
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
                    <View className="scale-hot-row__icon">
                      <Image className="scale-hot-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                    </View>
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
                  <Text>暂无热门量表，可进入全部量表查看。</Text>
                </View>
              )}
            </View>
          </View>

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
