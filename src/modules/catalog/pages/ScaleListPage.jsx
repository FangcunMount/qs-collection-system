import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import SearchBox from "@/shared/ui/SearchBox";
import { routes } from "@/shared/config/routes";
import { SCALE_COMMON_CATEGORIES, isVisibleInMedicalScaleCatalog } from "@/shared/config/scaleCatalogHome";
import { listPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import { getLogger } from "@/shared/lib/logger";
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

const matchesScaleSearch = (scale, searchText) => {
  const query = String(searchText || '').trim().toLowerCase();
  const haystack = [scale.code, scale.name, scale.description, scale.category, ...(scale.tags || [])]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
  if (query && !haystack.includes(query)) return false;
  return true;
};

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
    console.warn("[ScaleListPage] 获取状态栏高度失败:", error);
    return { statusBarHeight: 0 };
  }
};

const ScaleListPage = () => {
  const [scaleList, setScaleList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());
  const [pagination, setPagination] = useState({
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
      const hasSearch = Boolean(String(searchText || '').trim());
      const loadAllPages = hasSearch || !selectedCategory;
      let currentPage = loadAllPages ? 1 : page;
      let totalPages = 1;
      let total = 0;
      const collected = [];

      do {
        const result = await listPublishedAssessmentModels({
          kind: 'scale',
          category: selectedCategory || undefined,
          page: currentPage,
          pageSize: 20,
        });
        const payload = result.data || result;
        collected.push(...(payload.models || []).map(normalizeScale).filter(
          (scale) => isVisibleInMedicalScaleCatalog(scale.category)
        ));
        total = Number(payload.total || collected.length);
        totalPages = Math.max(1, Number(payload.total_pages || Math.ceil(total / (payload.page_size || 20))));
        if (!loadAllPages) break;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const filtered = hasSearch
        ? collected.filter(scale => matchesScaleSearch(scale, searchText))
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
    setNavMetrics(resolveHeaderMetrics());
  }, []);

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

  const handleChipClick = useCallback((value) => {
    setSearchText("");
    setSelectedCategory(value);
    setQueryToken((token) => token + 1);
  }, []);

  const handleScaleClick = useCallback((scale) => {
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
    <View className="scale-list-page">
      <ScrollView scrollY className="scale-list-page__scroll" enhanced showScrollbar={false}>
        <View
          className="scale-list-nav"
          style={{ paddingTop: `${navMetrics.statusBarHeight}px` }}
        >
          <View className="scale-list-nav__back" onClick={handleBack}>
            <AtIcon value="chevron-left" size="26" color="#071735" />
          </View>
          <Text className="scale-list-nav__title">全部量表</Text>
          <View className="scale-list-nav__spacer" />
        </View>

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
              <View
                key={chip.key}
                className={`scale-list-chip ${selectedCategory === chip.value ? "is-active" : ""}`}
                onClick={() => handleChipClick(chip.value)}
              >
                <Text className="scale-list-chip__text">{chip.title}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className="scale-list-count">
          <Text>{pagination.total ? `共 ${pagination.total} 个量表` : "量表列表"}</Text>
        </View>

        <View className="scale-list">
          {loading && scaleList.length === 0 ? (
            <View className="scale-list-placeholder">
              <Text>正在加载量表...</Text>
            </View>
          ) : scaleList.length > 0 ? (
            <>
              {scaleList.map((scale) => (
                <View
                  key={scale.code || scale.name}
                  className="scale-list-row"
                  onClick={() => handleScaleClick(scale)}
                >
                  <View className="scale-list-row__icon">
                    <Image className="scale-list-row__image" src={resolveScaleImage(scale)} mode="aspectFit" />
                  </View>
                  <View className="scale-list-row__content">
                    <Text className="scale-list-row__title">{scale.name}</Text>
                    <Text className="scale-list-row__desc">{scale.description}</Text>
                  </View>
                  <Text className="scale-list-row__duration">{formatDuration(scale)}</Text>
                </View>
              ))}
              {pagination.page < pagination.total_pages && (
                <View className="scale-list-load-more" onClick={handleLoadMore}>
                  <Text>加载更多</Text>
                </View>
              )}
            </>
          ) : (
            <View className="scale-list-placeholder">
              <Text>暂无匹配量表，请换个关键词或分类试试。</Text>
            </View>
          )}
        </View>

        <View className="scale-list__bottom-spacer" />
      </ScrollView>
    </View>
  );
};

export default ScaleListPage;
