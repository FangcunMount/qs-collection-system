import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import BottomMenu from "@/shared/ui/BottomMenu";
import SearchBox from "@/shared/ui/SearchBox";
import ScaleCard from "@/shared/ui/ScaleCard";
import LoadingState from "@/shared/ui/LoadingState";
import EmptyState from "@/shared/ui/EmptyState";
import { routes } from "@/shared/config/routes";
import "./ScaleCatalogPage.less";
import { getScaleCategories, getScales } from "@/services/api/scales";
import { getLogger } from "@/shared/lib/logger";

const PAGE_NAME = "questionnaire_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [scaleList, setScaleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
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
    } catch (error) {
      console.error('加载筛选元数据失败:', error);
    }
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) setSearchText(params.keyword);
    if (params.category) setSelectedCategory(params.category);
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
        category: selectedCategory
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
  }, [searchText, selectedCategory]);

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
    Taro.navigateTo({ url: routes.assessmentFill({ q: scale.code }) });
  };

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

      <BottomMenu activeKey="量表" />
    </>
  );
};

export default QuestionsheetList;
