import React, { useEffect, useState, useCallback, useMemo } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import BottomMenu from "../../../components/bottomMenu";
import { SearchBox, ScaleCard } from "../../../components/common";
import LoadingState from "../../common/components/LoadingState/LoadingState";
import EmptyState from "../../common/components/EmptyState/EmptyState";
import "./index.less";
import { getScaleCategories, getScales } from "../../../services/api/scaleApi";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const FILTER_ACTIONS = [
  { key: "stage", title: "阶段" },
  { key: "applicableAge", title: "年龄" },
  { key: "reporter", title: "填报人" },
  { key: "tag", title: "标签" }
];

const QuestionsheetList = () => {
  const [scaleList, setScaleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filterMeta, setFilterMeta] = useState({
    stages: [],
    applicable_ages: [],
    reporters: [],
    tags: []
  });
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedApplicableAge, setSelectedApplicableAge] = useState("");
  const [selectedReporter, setSelectedReporter] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });
  const [isParamsReady, setIsParamsReady] = useState(false);

  usePullDownRefresh(async () => {
    await loadScaleList(1, false);
    Taro.stopPullDownRefresh();
  });

  const loadCategories = useCallback(async () => {
    try {
      const result = await getScaleCategories();
      const payload = result.data || result;
      const categoryList = payload.categories || [];
      setCategories([{ value: null, label: '全部' }, ...categoryList]);
      setFilterMeta({
        stages: payload.stages || [],
        applicable_ages: payload.applicable_ages || [],
        reporters: payload.reporters || [],
        tags: payload.tags || []
      });
    } catch (error) {
      console.error('加载筛选元数据失败:', error);
    }
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) setSearchText(params.keyword);
    if (params.category) setSelectedCategory(params.category);
    if (params.stage) setSelectedStage(params.stage);
    if (params.applicable_age) setSelectedApplicableAge(params.applicable_age);
    if (params.reporter) setSelectedReporter(params.reporter);
    if (params.tag) setSelectedTag(params.tag);
    setIsParamsReady(true);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadScaleList = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(true);
      const result = await getScales({
        page,
        pageSize: 20,
        title: searchText,
        category: selectedCategory,
        stages: selectedStage ? [selectedStage] : [],
        applicableAges: selectedApplicableAge ? [selectedApplicableAge] : [],
        reporters: selectedReporter ? [selectedReporter] : [],
        tags: selectedTag ? [selectedTag] : []
      });
      const payload = result.data || result;
      const scales = payload.scales || [];
      const formatted = scales.map(item => ({
        code: item.code,
        name: item.title,
        description: item.description || "专业心理测评工具，帮助您了解心理健康状况。",
        category: item.category,
        stages: item.stages || [],
        applicableAges: item.applicable_ages || [],
        reporters: item.reporters || [],
        tags: item.tags || [],
        question_count: item.question_count || 0,
        status: item.status
      }));

      setScaleList(prev => (append ? [...prev, ...formatted] : formatted));
      setPagination({
        page: payload.page || page,
        page_size: payload.page_size || 20,
        total: payload.total || 0,
        total_pages: payload.total_pages || 0
      });
    } catch (error) {
      console.error('加载量表列表失败:', error);
      Taro.showToast({
        title: "加载失败，请重试",
        icon: "none",
        duration: 2000
      });
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedApplicableAge, selectedCategory, selectedReporter, selectedStage, selectedTag]);

  useEffect(() => {
    if (isParamsReady) {
      loadScaleList(1, false);
    }
  }, [isParamsReady, loadScaleList]);

  const handleSearch = useCallback(() => {
    loadScaleList(1, false);
  }, [loadScaleList]);

  const handleScaleClick = (scale) => {
    logger.RUN("点击量表", scale);
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", { q: scale.code })
    });
  };

  const openFilterActionSheet = useCallback((type) => {
    const source = {
      stage: filterMeta.stages,
      applicableAge: filterMeta.applicable_ages,
      reporter: filterMeta.reporters,
      tag: filterMeta.tags
    }[type] || [];

    const labels = ['全部', ...source];
    Taro.showActionSheet({
      itemList: labels,
      success: ({ tapIndex }) => {
        const value = tapIndex === 0 ? '' : source[tapIndex - 1];
        if (type === 'stage') setSelectedStage(value);
        if (type === 'applicableAge') setSelectedApplicableAge(value);
        if (type === 'reporter') setSelectedReporter(value);
        if (type === 'tag') setSelectedTag(value);
      }
    });
  }, [filterMeta]);

  const activeFilters = useMemo(() => ([
    selectedStage && { label: `阶段 · ${selectedStage}`, onClear: () => setSelectedStage('') },
    selectedApplicableAge && { label: `年龄 · ${selectedApplicableAge}`, onClear: () => setSelectedApplicableAge('') },
    selectedReporter && { label: `填报人 · ${selectedReporter}`, onClear: () => setSelectedReporter('') },
    selectedTag && { label: `标签 · ${selectedTag}`, onClear: () => setSelectedTag('') }
  ].filter(Boolean)), [selectedApplicableAge, selectedReporter, selectedStage, selectedTag]);

  const handleLoadMore = () => {
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({ title: '没有更多量表了', icon: 'none' });
      return;
    }
    loadScaleList(pagination.page + 1, true);
  };

  return (
    <>
      <View className="questionnaire-list-page">
        <View className="search-filter-section">
          <SearchBox
            placeholder="搜索量表名称..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
            onConfirm={handleSearch}
          />

          {categories.length > 0 && (
            <View className="category-filter">
              <ScrollView scrollX className="category-scroll">
                {categories.map((category) => (
                  <View
                    key={category.value || 'all'}
                    className={`category-item ${selectedCategory === category.value ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    <Text className="category-text">{category.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView scrollX className="advanced-filter-scroll">
            <View className="advanced-filter-row">
              {FILTER_ACTIONS.map((filter) => (
                <View
                  key={filter.key}
                  className="advanced-filter-chip"
                  onClick={() => openFilterActionSheet(filter.key)}
                >
                  <Text className="advanced-filter-chip__text">{filter.title}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {activeFilters.length > 0 && (
            <View className="active-filter-list">
              {activeFilters.map(filter => (
                <View key={filter.label} className="active-filter-tag" onClick={filter.onClear}>
                  <Text className="active-filter-tag__text">{filter.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="scale-list-container">
          {loading && scaleList.length === 0 ? (
            <LoadingState content="加载中..." />
          ) : scaleList.length > 0 ? (
            <View className="scale-list">
              {scaleList.map(scale => (
                <ScaleCard
                  key={scale.code}
                  scale={scale}
                  onClick={() => handleScaleClick(scale)}
                />
              ))}
              {pagination.page < pagination.total_pages && (
                <View className="load-more" onClick={handleLoadMore}>
                  <Text className="load-more-text">加载更多</Text>
                </View>
              )}
            </View>
          ) : (
            <EmptyState text="暂无量表" icon="📋" />
          )}
        </View>
      </View>

      <BottomMenu activeKey="发现" />
    </>
  );
};

export default QuestionsheetList;
