import React, { useEffect, useState, useCallback, useRef } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView, Picker } from "@tarojs/components";
import ActionButton from "@/shared/ui/ActionButton";
import MedicalScaleCard from "../components/MedicalScaleCard";
import Icon from "@/shared/ui/Icon";
import SearchBox from "@/shared/ui/SearchBox";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import FilterChip from "@/shared/ui/FilterChip";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isMedicalScaleCategory } from "@/shared/config/scaleCatalogHome";
import { listPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
import {
  mapMedicalCatalogCard,
  matchesCatalogCardSearch,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import "./ScaleListPage.less";

const logger = getLogger("questionnaire_full_list");

const CATEGORY_CHIPS = [
  { value: null, key: "all", title: "全部" },
  ...SCALE_COMMON_CATEGORIES.map((item) => ({ value: item.value, key: item.key, title: item.title })),
];

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
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });
  const [isParamsReady, setIsParamsReady] = useState(false);
  const [queryToken, setQueryToken] = useState(0);
  const [filterMode, setFilterMode] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState("");
  const [reporterFilter, setReporterFilter] = useState("");


  const requestGeneration = useRef(0);
  const requestPending = useRef(false);

  useEffect(() => () => { requestGeneration.current += 1; }, []);

  const loadScaleList = useCallback(async (page = 1, append = false) => {
    const generation = ++requestGeneration.current;
    requestPending.current = true;
    if (!append) {
      setScaleList([]);
      setPagination({ page: 1, page_size: 20, total: 0, total_pages: 0 });
    }
    try {
      setLoading(true);
      setLoadError("");
      const hasSearch = Boolean(String(appliedSearchText || '').trim());
      const loadAllPages = hasSearch || !selectedCategory || filterMode;
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
        if (generation !== requestGeneration.current) return;
        const payload = (result.data || result) as Record<string, unknown>;
        const models: unknown[] = Array.isArray(payload.models) ? payload.models : [];
        collected.push(...models.map(mapMedicalCatalogCard).filter(
          (scale) => isMedicalScaleCategory(scale.category)
        ));
        total = Number(payload.total || collected.length);
        const responsePageSize = Number(payload.page_size || 20);
        totalPages = Math.max(1, Number(payload.total_pages || Math.ceil(total / responsePageSize)));
        if (!loadAllPages) break;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const filtered = hasSearch
        ? collected.filter((scale) => matchesCatalogCardSearch(scale, appliedSearchText))
        : collected;
      setScaleList((prev) => (append ? [...prev, ...filtered] : filtered));
      setPagination({
        page: loadAllPages ? 1 : page,
        page_size: 20,
        total: loadAllPages ? filtered.length : total,
        total_pages: loadAllPages ? 1 : totalPages,
      });
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      console.error("加载量表列表失败:", error);
      setLoadError("量表目录加载失败，请检查网络后重试。");
      Taro.showToast({ title: "加载失败，请重试", icon: "none", duration: 2000 });
    } finally {
      if (generation === requestGeneration.current) {
        requestPending.current = false;
        setLoading(false);
      }
    }
  }, [appliedSearchText, selectedCategory, filterMode]);

  usePullDownRefresh(async () => {
    await loadScaleList(1, false);
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) {
      setSearchText(params.keyword);
      setAppliedSearchText(params.keyword);
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
    requestGeneration.current += 1;
    setAudienceFilter("");
    setReporterFilter("");
    setSelectedCategory(null);
    setAppliedSearchText(searchText.trim());
    setQueryToken((token) => token + 1);
  }, [searchText]);

  const handleChipClick = useCallback((value: string | null) => {
    requestGeneration.current += 1;
    setSearchText("");
    setAppliedSearchText("");
    setAudienceFilter("");
    setReporterFilter("");
    setSelectedCategory(value);
    setQueryToken((token) => token + 1);
  }, []);

  const handleScaleClick = useCallback((scale: CatalogCardViewModel) => {
    logger.RUN("点击量表", scale);
    if (scale.disabled) {
      Taro.showToast({ title: "量表暂不可用", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
  }, []);

  const handleLoadMore = () => {
    if (requestPending.current) return;
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({ title: "没有更多量表了", icon: "none" });
      return;
    }
    loadScaleList(pagination.page + 1, true);
  };

  // Facets are offered only after every page in the current category is loaded.
  // Missing audience/reporter metadata is never inferred from a scale title.
  const audienceOptions = ["全部对象", ...Array.from(new Set(scaleList.flatMap(card => card.audienceLabel.split("、").filter(Boolean))))];
  const reporterOptions = ["全部填写者", ...Array.from(new Set(scaleList.flatMap(card => card.reporterLabel.split("、").filter(Boolean))))];
  const visibleScales = scaleList.filter(card =>
    (!audienceFilter || card.audienceLabel.split("、").includes(audienceFilter)) &&
    (!reporterFilter || card.reporterLabel.split("、").includes(reporterFilter))
  );
  const categoryTitle = CATEGORY_CHIPS.find(chip => chip.value === selectedCategory)?.title;
  const listTitle = appliedSearchText ? "搜索结果" : selectedCategory ? `${categoryTitle || "医学"}量表` : "全部量表";
  const toggleFilters = () => {
    setFiltersExpanded(value => !value);
    if (!filterMode) {
      requestGeneration.current += 1;
      setFilterMode(true);
      setQueryToken(token => token + 1);
    }
  };

  return (
    <PageShell
      tone="medical"
      className="scale-list-page"
      contentClassName="scale-list-page__scroll"
      navigation={(
        <AppNavigationBar title="医学量表" showBack onBack={handleBack} tone="medical" transparent />
      )}
    >

        <View className="scale-list-search">
          <SearchBox
            className="scale-list-search-box"
            placeholder="搜索量表名称或关键词"
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

        <View className="scale-list-filters">
          <View className="scale-list-filters__toggle" onClick={toggleFilters}>
            <Text>{[audienceFilter || "适用对象", reporterFilter || "填写者"].join(" · ")}</Text>
            <View className="scale-list-filters__action"><Text>{filtersExpanded ? "收起" : "筛选"}</Text><Icon name="filter" size={18} /></View>
          </View>
          {filtersExpanded ? <View className="scale-list-filters__fields">
            <Picker mode="selector" range={audienceOptions} value={Math.max(0, audienceOptions.indexOf(audienceFilter))}
              disabled={loading || Boolean(loadError)} onChange={event => setAudienceFilter(audienceOptions[Number(event.detail.value)] === "全部对象" ? "" : audienceOptions[Number(event.detail.value)])}>
              <View className="scale-list-filters__field"><Text>适用对象</Text><Text>{audienceFilter || "全部对象"} ⌄</Text></View>
            </Picker>
            <Picker mode="selector" range={reporterOptions} value={Math.max(0, reporterOptions.indexOf(reporterFilter))}
              disabled={loading || Boolean(loadError)} onChange={event => setReporterFilter(reporterOptions[Number(event.detail.value)] === "全部填写者" ? "" : reporterOptions[Number(event.detail.value)])}>
              <View className="scale-list-filters__field"><Text>填写者</Text><Text>{reporterFilter || "全部填写者"} ⌄</Text></View>
            </Picker>
            <Text className="scale-list-filters__note">{loading ? "正在加载可筛选范围…" : "按量表已提供的信息筛选，未标注信息不作推断。"}</Text>
          </View> : null}
        </View>
        <View className="scale-list-hint"><Icon name="info" size={16} /><Text>先确认适用对象，再选择评估工具</Text></View>
        <View className="scale-list-count">
          <Text className="scale-list-count__title">{listTitle}</Text>
          <Text>{loading ? "正在更新量表…" : loadError && !scaleList.length ? "加载失败" : `共 ${filterMode ? visibleScales.length : pagination.total} 个量表`}</Text>
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
          ) : visibleScales.length > 0 ? (
            <>
              {visibleScales.map((scale) => (
                <MedicalScaleCard key={scale.code || scale.title} card={scale}
                  className="scale-list-row" onSelect={() => handleScaleClick(scale)} />
              ))}
              {loadError ? <StatePanel state="error" compact tone="medical" title="后续量表加载失败" description="已加载的量表仍可查看，请重试。" actionText="重试加载" onAction={() => loadScaleList(pagination.page + 1, true)} /> : null}
              {pagination.page < pagination.total_pages && !loadError ? (
                <ActionButton variant="secondary" block loading={loading} onClick={handleLoadMore}>加载更多</ActionButton>
              ) : null}
            </>
          ) : (
            <StatePanel
              state="empty"
              title="暂无匹配量表"
              description="请换个关键词、分类或筛选条件试试。"
              tone="medical"
              compact
            />
          )}
        </View>

        <View className="scale-list-disclaimer"><Text>评估结果供参考，不替代专业诊断。</Text></View>
        <View className="scale-list__bottom-spacer" />
    </PageShell>
  );
};

export default ScaleListPage;
