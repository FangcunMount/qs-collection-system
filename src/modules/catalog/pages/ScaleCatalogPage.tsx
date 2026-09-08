import React, { useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";
import SearchBox from "@/shared/ui/SearchBox";
import BottomMenu from "@/shared/ui/BottomMenu";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isMedicalScaleCategory } from "@/shared/config/scaleCatalogHome";
import { listHotPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
import {
  mapMedicalCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import MedicalScaleCard from "../components/MedicalScaleCard";
import sleepIcon from "@/pages/catalog-medical/assets/icon/sleep.png";
import moodIcon from "@/pages/catalog-medical/assets/icon/mood.png";
import pressureIcon from "@/pages/catalog-medical/assets/icon/pressure.png";
import attentionIcon from "@/pages/catalog-medical/assets/icon/attention.png";
import "./ScaleCatalogPage.less";

const PAGE_NAME = "questionnaire_list";
const logger = getLogger(PAGE_NAME);

const CATEGORY_ICONS: Record<string, string> = { sleep: sleepIcon, mood: moodIcon, pressure: pressureIcon, attention: attentionIcon };

const FEATURED_CATEGORIES = SCALE_COMMON_CATEGORIES.slice(0, 4);

const ScaleCatalogPage = () => {
  const [searchText, setSearchText] = useState("");
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
        (scale) => isMedicalScaleCategory(scale.category)
      ));
    } catch (error) {
      console.error("加载热门量表失败:", error);
      setHotScales([]);
      setHotError("量表加载失败，请检查网络后重试。");
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
    if (scale.disabled) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
  }, []);

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
            <Text className="scale-page__subtitle">了解当下状态，为进一步沟通提供参考</Text>
          </View>
          <View className="scale-page__search">
            <SearchBox placeholder="搜索量表名称或关注的问题" value={searchText}
              onInput={(event) => setSearchText(event.detail.value)}
              onConfirm={() => handleOpenScaleList({ keyword: searchText.trim() })} />
          </View>
          <View className="scale-service-links">
            <View className="scale-service-link" onClick={() => Taro.navigateTo({ url: routes.assessmentRecords() })}>
              <Icon name="records" size={26} /><Text>评估记录</Text><Icon name="arrow-right" size={16} />
            </View>
            <View className="scale-service-link" onClick={() => Taro.navigateTo({ url: routes.testeeList() })}>
              <Icon name="group" size={26} /><Text>家庭成员</Text><Icon name="arrow-right" size={16} />
            </View>
          </View>

          <View className="scale-section">
            <View className="scale-section__header">
              <Text className="scale-section__title">按关注的问题查找</Text>
              <View className="scale-section__more" onClick={() => handleOpenScaleList()}>
                <Text>全部分类</Text>
                <Icon name="arrow-right" size={14} />
              </View>
            </View>
            <View className="scale-cat-grid">
              {FEATURED_CATEGORIES.map((category) => (
                <SurfaceCard
                  key={category.key}
                  className={`scale-cat-card scale-cat-card--${category.key}`}
                  onClick={() => handleOpenScaleList({ category: category.value })}
                >
                  <Image className="scale-cat-card__icon" src={CATEGORY_ICONS[category.key]} mode="aspectFit" />
                  <Text className="scale-cat-card__title">{category.title}</Text>
                </SurfaceCard>
              ))}
            </View>
          </View>

          <View className="scale-selection-hint"><Icon name="info" size={16} /><Text>选择前，请确认适用对象与填写者。</Text></View>

          <View className="scale-section">
            <SectionHeader
              title="医学量表"
              actionLabel="查看全部"
              onAction={() => handleOpenScaleList()}
              tone="medical"
              className="scale-section__header"
            />
            <View className="scale-hot-list">
              {hotLoading ? (
                <StatePanel state="loading" title="正在加载量表" tone="medical" compact />
              ) : hotError ? (
                <StatePanel
                  state="error"
                  title="量表加载失败"
                  description={hotError}
                  actionText="重新加载"
                  onAction={loadHotScales}
                  tone="medical"
                  compact
                />
              ) : hotScales.length > 0 ? (
                hotScales.map((scale) => (
                  <MedicalScaleCard key={scale.code || scale.title} card={scale}
                    className="scale-hot-row" compact onSelect={() => handleScaleClick(scale)} />
                ))
              ) : (
                <StatePanel
                  state="empty"
                  title="暂无量表"
                  description="可进入全部量表继续查找。"
                  actionText="查看全部量表"
                  onAction={() => handleOpenScaleList()}
                  tone="medical"
                  compact
                />
              )}
            </View>
          </View>

          <View className="scale-disclaimer"><Icon name="info" size={16} /><Text>测评结果用于观察与沟通参考，不替代诊断。</Text></View>

          <View className="scale-page__bottom-spacer" />
      </PageShell>

      <BottomMenu activeKey="量表" />
    </>
  );
};

export default ScaleCatalogPage;
