import React, { useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import BottomMenu from "@/shared/ui/BottomMenu";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isVisibleInMedicalScaleCatalog } from "@/shared/config/scaleCatalogHome";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { listHotPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
import {
  mapMedicalCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
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

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  sleep: categorySleepImage,
  mood: categoryMoodImage,
  pressure: categoryPressureImage,
  attention: categoryAttentionImage,
  child: categoryChildImage,
  sensory: categorySensoryImage,
};

const FEATURED_CATEGORIES = SCALE_COMMON_CATEGORIES.slice(0, 4);

const resolveScaleImage = (scale: CatalogCardViewModel) => {
  const marker = [
    scale.title,
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

const ScaleCatalogPage = () => {
  const [hotScales, setHotScales] = useState<CatalogCardViewModel[]>([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [hotError, setHotError] = useState("");

  const loadHotScales = useCallback(async () => {
    try {
      setHotLoading(true);
      setHotError("");
      const result = await listHotPublishedAssessmentModels();
	  const payload = result.data || result;
	  const models: unknown[] = Array.isArray(payload.models) ? payload.models : [];
	  setHotScales(models.map(mapMedicalCatalogCard).filter(
        (scale) => isVisibleInMedicalScaleCatalog(scale.category)
      ));
    } catch (error) {
      console.error("加载热门量表失败:", error);
      setHotScales([]);
      setHotError("热门量表加载失败，请检查网络后重试。");
    } finally {
      setHotLoading(false);
    }
  }, []);

  usePullDownRefresh(async () => {
    await loadHotScales();
    Taro.stopPullDownRefresh();
  });

  React.useEffect(() => {
    loadHotScales();
  }, [loadHotScales]);

  const handleOpenScaleList = useCallback((params?: Record<string, string>) => {
    Taro.navigateTo({ url: routes.scaleList(params) });
  }, []);

  const handleScaleClick = useCallback((scale: CatalogCardViewModel) => {
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

  const handleQuickAction = useCallback((key: string) => {
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
      <PageShell
        tone="medical"
        className="scale-page"
        contentClassName="scale-page__scroll"
        bottomInset={false}
        navigation={<AppNavigationBar brandTitle="Qlume" tone="medical" transparent />}
      >
          <View className="scale-page__header">
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
                <SurfaceCard
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
                </SurfaceCard>
              ))}
            </View>
          </View>

          <View className="scale-section">
            <SectionHeader
              title="热门量表"
              actionLabel="查看更多"
              onAction={() => handleOpenScaleList()}
              tone="medical"
              className="scale-section__header"
            />
            <View className="scale-hot-list">
              {hotLoading ? (
                <StatePanel state="loading" title="正在加载热门量表" tone="medical" compact />
              ) : hotError ? (
                <StatePanel
                  state="error"
                  title="热门量表加载失败"
                  description={hotError}
                  actionText="重新加载"
                  onAction={loadHotScales}
                  tone="medical"
                  compact
                />
              ) : hotScales.length > 0 ? (
                hotScales.map((scale) => (
                  <SurfaceCard
                    key={scale.code || scale.title}
                    className="scale-hot-row"
                    onClick={() => handleScaleClick(scale)}
                  >
                    <View className="scale-hot-row__icon">
                      <Image className="scale-hot-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                    </View>
                    <View className="scale-hot-row__content">
                      <View className="scale-hot-row__title-line">
                        <Text className="scale-hot-row__title">{scale.title}</Text>
                        <Text className="scale-hot-row__tag">
                          {scale.tags[0] || scale.durationLabel}
                        </Text>
                      </View>
                      <Text className="scale-hot-row__desc">{scale.description}</Text>
                    </View>
                    <AtIcon value="chevron-right" size="18" color="#9AA6B8" />
                  </SurfaceCard>
                ))
              ) : (
                <StatePanel
                  state="empty"
                  title="暂无热门量表"
                  description="可进入全部量表继续查找。"
                  actionText="查看全部量表"
                  onAction={() => handleOpenScaleList()}
                  tone="medical"
                  compact
                />
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
      </PageShell>

      <BottomMenu activeKey="量表" />
    </>
  );
};

export default ScaleCatalogPage;
