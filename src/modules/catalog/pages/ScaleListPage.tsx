import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import SearchBox from "@/shared/ui/SearchBox";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import FilterChip from "@/shared/ui/FilterChip";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isVisibleInMedicalScaleCatalog } from "@/shared/config/scaleCatalogHome";
import { listPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
import {
  mapMedicalCatalogCard,
  matchesCatalogCardSearch,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import categorySleepImage from "@/pages/catalog-medical/assets/home/category-sleep.png";
import categoryMoodImage from "@/pages/catalog-medical/assets/home/category-mood.png";
import categoryPressureImage from "@/pages/catalog-medical/assets/home/category-pressure.png";
import categoryAttentionImage from "@/pages/catalog-medical/assets/home/category-attention.png";
import categoryChildImage from "@/pages/catalog-medical/assets/home/category-child.png";
import categorySensoryImage from "@/pages/catalog-medical/assets/home/category-sensory.png";
import "./ScaleListPage.less";

const logger = getLogger("questionnaire_full_list");

const CATEGORY_CHIPS = [
  { value: null, key: "all", title: "全部" },
  ...SCALE_COMMON_CATEGORIES.map((item) => ({ value: item.value, key: item.key, title: item.title })),
];

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

interface PaginationState {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface CatalogQuery {
  kind: string;
  category?: string;
  page: number;
  pageSize: number;
}

const loadPublishedModels = listPublishedAssessmentModels as unknown as (
  query: CatalogQuery,
) => Promise<Record<string, unknown>>;

const ScaleListPage = () => {
  const [scaleList, setScaleList] = useState<CatalogCardViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });
  const [isParamsReady, setIsParamsReady] = useState(false);
  const [queryToken, setQueryToken] = useState(0);

  const loadScaleList = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(true);
      setLoadError("");
      const hasSearch = Boolean(String(searchText || '').trim());
      const loadAllPages = hasSearch || !selectedCategory;
      let currentPage = loadAllPages ? 1 : page;
      let totalPages = 1;
      let total = 0;
      const collected: CatalogCardViewModel[] = [];

      do {
        const result = await loadPublishedModels({
          kind: 'scale',
          category: selectedCategory || undefined,
          page: currentPage,
          pageSize: 20,
        });
        const payload = (result.data || result) as Record<string, unknown>;
        const models: unknown[] = Array.isArray(payload.models) ? payload.models : [];
        collected.push(...models.map(mapMedicalCatalogCard).filter(
          (scale) => isVisibleInMedicalScaleCatalog(scale.category)
        ));
        total = Number(payload.total || collected.length);
        const responsePageSize = Number(payload.page_size || 20);
        totalPages = Math.max(1, Number(payload.total_pages || Math.ceil(total / responsePageSize)));
        if (!loadAllPages) break;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const filtered = hasSearch
        ? collected.filter((scale) => matchesCatalogCardSearch(scale, searchText))
        : collected;
      setScaleList((prev) => (append ? [...prev, ...filtered] : filtered));
      setPagination({
        page: loadAllPages ? 1 : page,
        page_size: 20,
        total: loadAllPages ? filtered.length : total,
        total_pages: loadAllPages ? 1 : totalPages,
      });
    } catch (error) {
      console.error("加载量表列表失败:", error);
      setLoadError("量表目录加载失败，请检查网络后重试。");
      Taro.showToast({ title: "加载失败，请重试", icon: "none", duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedCategory]);

  usePullDownRefresh(async () => {
    await loadScaleList(1, false);
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) {
      setSearchText(params.keyword);
    }
    if (params.category) {
      setSelectedCategory(params.category);
    }
    setIsParamsReady(true);
  }, []);

  useEffect(() => {
    if (!isParamsReady) return;
    loadScaleList(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParamsReady, queryToken]);

  const handleBack = useCallback(() => {
    const pages = Taro.getCurrentPages?.() || [];
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.redirectTo({ url: routes.tabScales() });
  }, []);

  const handleSearch = useCallback(() => {
    setSelectedCategory(null);
    setQueryToken((token) => token + 1);
  }, []);

  const handleChipClick = useCallback((value: string | null) => {
    setSearchText("");
    setSelectedCategory(value);
    setQueryToken((token) => token + 1);
  }, []);

  const handleScaleClick = useCallback((scale: CatalogCardViewModel) => {
    logger.RUN("点击量表", scale);
    if (!scale?.code) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
  }, []);

  const handleLoadMore = () => {
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({ title: "没有更多量表了", icon: "none" });
      return;
    }
    loadScaleList(pagination.page + 1, true);
  };

  return (
    <PageShell
      tone="medical"
      className="scale-list-page"
      contentClassName="scale-list-page__scroll"
      navigation={(
        <AppNavigationBar title="全部量表" showBack onBack={handleBack} tone="medical" transparent />
      )}
    >

        <View className="scale-list-search">
          <SearchBox
            className="scale-list-search-box"
            placeholder="搜索量表名称、关键词"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
            onConfirm={handleSearch}
            iconColor="#8A96AA"
            iconSize={18}
          />
        </View>

        <ScrollView scrollX className="scale-list-chip-scroll" enhanced showScrollbar={false}>
          <View className="scale-list-chip-track">
            {CATEGORY_CHIPS.map((chip) => (
              <FilterChip
                key={chip.key}
                className="scale-list-chip"
                selected={selectedCategory === chip.value}
                tone="medical"
                onClick={() => handleChipClick(chip.value)}
              >
                {chip.title}
              </FilterChip>
            ))}
          </View>
        </ScrollView>

        <View className="scale-list-count">
          <Text>{pagination.total ? `共 ${pagination.total} 个量表` : "量表列表"}</Text>
        </View>

        <View className="scale-list">
          {loading && scaleList.length === 0 ? (
            <StatePanel state="loading" title="正在加载量表" tone="medical" compact />
          ) : loadError && scaleList.length === 0 ? (
            <StatePanel
              state="error"
              title="量表目录加载失败"
              description={loadError}
              actionText="重新加载"
              onAction={() => loadScaleList(1, false)}
              tone="medical"
              compact
            />
          ) : scaleList.length > 0 ? (
            <>
              {scaleList.map((scale) => (
                <SurfaceCard
                  key={scale.code || scale.title}
                  className="scale-list-row"
                  onClick={() => handleScaleClick(scale)}
                >
                  <View className="scale-list-row__icon">
                    <Image className="scale-list-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                  </View>
                  <View className="scale-list-row__content">
                    <Text className="scale-list-row__title">{scale.title}</Text>
                    <Text className="scale-list-row__desc">{scale.description}</Text>
                  </View>
                  <Text className="scale-list-row__duration">{scale.durationLabel}</Text>
                </SurfaceCard>
              ))}
              {pagination.page < pagination.total_pages && (
                <View className="scale-list-load-more" onClick={handleLoadMore}>
                  <Text>加载更多</Text>
                </View>
              )}
            </>
          ) : (
            <StatePanel
              state="empty"
              title="暂无匹配量表"
              description="请换个关键词或分类试试。"
              tone="medical"
              compact
            />
          )}
        </View>

        <View className="scale-list__bottom-spacer" />
    </PageShell>
  );
};

export default ScaleListPage;
