import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import { AtActivityIndicator } from "taro-ui";
import BottomMenu from "../../../components/bottomMenu";
import { SearchBox, ScaleCard } from "../../../components/common";
import LoadingState from "../../common/components/LoadingState/LoadingState";
import EmptyState from "../../common/components/EmptyState/EmptyState";

import "./index.less";
import { getScaleCategories } from "../../../services/api/scaleApi";
import { request } from "../../../services/servers";
import config from "../../../config";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [questionsheetList, setQuestionsheetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null); // null 表示全部
  const [categories, setCategories] = useState([]);

  // 页面级下拉刷新
  usePullDownRefresh(async () => {
    await loadQuestionsheetList();
    Taro.stopPullDownRefresh();
  });

  // 加载分类选项
  const loadCategories = useCallback(async () => {
    try {
      const result = await getScaleCategories();
      const categoryList = result.categories || [];
      // 添加"全部"选项到开头
      const allCategories = [
        { value: null, label: '全部' },
        ...categoryList
      ];
      setCategories(allCategories);
    } catch (error) {
      console.error('加载分类选项失败:', error);
    }
  }, []);

  // 初始化：从 URL 参数获取筛选条件
  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    if (params.keyword) {
      setSearchText(params.keyword);
    }
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 加载量表列表
  const loadQuestionsheetList = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = { 
        page: 1, 
        page_size: 100 
      };
      if (searchText) queryParams.title = searchText;
      if (selectedCategory) queryParams.category = selectedCategory;
      
      console.log('加载量表列表，参数:', queryParams);
      
      // 构建查询字符串
      const queryString = Object.keys(queryParams)
        .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      
      const result = await request(`/scales?${queryString}`, {}, {
        host: config.collectionHost,
        needToken: true
      });
      
      const scales = result.data?.scales || result.scales || [];
      console.log('API 返回的数据量:', scales.length);
      
      const formattedList = scales.map(item => ({
        code: item.code,
        name: item.title,
        description: item.description || "专业心理测评工具，帮助您了解心理健康状况。",
        category: item.category,
        stages: item.stages || [],
        applicableAges: item.applicable_ages || [],
        reporters: item.reporters || [],
        tags: item.tags || [],
        question_count: item.question_count || 0, // 使用 API 返回的题目数量
        status: item.status
      }));
      
      setQuestionsheetList(formattedList);
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

  // 当搜索文本或分类变化时，重新加载列表
  useEffect(() => {
    loadQuestionsheetList();
  }, [loadQuestionsheetList]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    loadQuestionsheetList();
  }, [loadQuestionsheetList]);

  // 处理分类切换
  const handleCategoryChange = (categoryValue) => {
    console.log('handleCategoryChange 被调用，新分类值:', categoryValue, '当前分类:', selectedCategory);
    setSelectedCategory(categoryValue);
  };

  const handleQuestionsheetClick = questionsheet => {
    logger.RUN("点击量表", questionsheet);
    const params = {
      q: questionsheet.code
    };
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", params)
    });
  };


  const renderQuestionsheetCard = questionsheet => (
    <ScaleCard
      key={questionsheet.code}
      scale={questionsheet}
      onClick={() => handleQuestionsheetClick(questionsheet)}
    />
  );


  return (
    <>
      <View className="questionnaire-list-page">
        {/* 搜索和分类筛选区 */}
        <View className="search-filter-section">
          {/* 搜索框 */}
          <SearchBox
            placeholder="搜索量表或症状..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
            onConfirm={handleSearch}
          />

          {/* 分类筛选 */}
          {categories.length > 0 && (
            <View className="category-filter">
              <ScrollView scrollX className="category-scroll">
                {categories.map((category, index) => (
                  <View
                    key={category.value || 'all'}
                    className={`category-item ${selectedCategory === category.value ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(category.value)}
                  >
                    <Text className="category-text">{category.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 量表列表 */}
        <View className="scale-list-container">
          {loading ? (
            <LoadingState content="加载中..." />
          ) : questionsheetList.length > 0 ? (
            <View className="scale-list">
              {questionsheetList.map(questionsheet =>
                renderQuestionsheetCard(questionsheet)
              )}
              {/* 加载更多提示 */}
              <View className="load-more">
                <Text className="load-more-text">点击加载更多</Text>
              </View>
            </View>
          ) : (
            <EmptyState 
              text="暂无量表" 
              icon="📋"
            />
          )}
        </View>
      </View>

      <BottomMenu activeKey="发现" />
    </>
  );
};

export default QuestionsheetList;
