import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input, ScrollView } from "@tarojs/components";
import { AtIcon, AtActivityIndicator } from "taro-ui";
import BottomMenu from "../../../components/bottomMenu";

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

  // 格式化热度数字
  const formatCount = (count) => {
    if (count >= 10000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // 将 reporters 枚举值转换为中文
  const formatReporter = (reporter) => {
    const reporterMap = {
      'parent': '家长',
      'teacher': '教师',
      'self': '自评',
      'clinical': '临床'
    };
    return reporterMap[reporter] || reporter;
  };

  // 将 applicable_ages 枚举值转换为中文
  const formatApplicableAge = (age) => {
    const ageMap = {
      'infant': '婴儿',
      'preschool': '学龄前',
      'school_child': '学龄儿童',
      'adolescent': '青少年',
      'adult': '成人'
    };
    return ageMap[age] || age;
  };

  // 将 stages 枚举值转换为中文（用于 tab 显示）
  const formatStageLabel = (stageValue) => {
    const stageMap = {
      'screening': '筛查',
      'deep_assessment': '深度评估',
      'follow_up': '随访',
      'outcome': '结局'
    };
    return stageMap[stageValue] || stageValue;
  };

  const renderQuestionsheetCard = questionsheet => (
    <View
      key={questionsheet.code}
      className="scale-card"
      onClick={() => handleQuestionsheetClick(questionsheet)}
    >
      {/* 标题行 */}
      <View className="scale-header">
        <View className="scale-title-wrapper">
          <Text className="scale-title">{questionsheet.name}</Text>
        </View>
      </View>

      {/* 标签行 - stages 在左侧，tags 在右侧 */}
      {(questionsheet.stages && questionsheet.stages.length > 0) || (questionsheet.tags && questionsheet.tags.length > 0) ? (
        <View className="scale-tags-row">
          {/* 左侧：stages */}
          {questionsheet.stages && questionsheet.stages.length > 0 && (
            <View className="tags-left">
              <Text className="stages-text">
                {questionsheet.stages.map(formatStageLabel).join(' / ')}
              </Text>
            </View>
          )}
          
          {/* 右侧：tags */}
          {questionsheet.tags && questionsheet.tags.length > 0 && (
            <View className="tags-right">
              {questionsheet.tags.slice(0, 3).map((tag, idx) => (
                <View key={idx} className="tag tag-label">{tag}</View>
              ))}
              {questionsheet.tags.length > 3 && (
                <View className="tag tag-more">
                  <Text className="tag-more-text">+{questionsheet.tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : null}

      {/* 描述 */}
      <Text className="scale-desc">{questionsheet.description}</Text>

      {/* 底部信息栏 - 分两行 */}
      <View className="scale-footer">
        {/* 第一行：使用年龄 */}
        {questionsheet.applicableAges && questionsheet.applicableAges.length > 0 && (
          <View className="footer-row">
            <AtIcon value="user" size="14" color="#9CA3AF" />
            <Text className="footer-text">
              {questionsheet.applicableAges.map(formatApplicableAge).join('、')}
            </Text>
          </View>
        )}
        
        {/* 第二行：填报人和题目数量 */}
        <View className="footer-row">
          {questionsheet.reporters && questionsheet.reporters.length > 0 && (
            <View className="footer-item">
              <AtIcon value="edit" size="14" color="#9CA3AF" />
              <Text className="footer-text">
                {questionsheet.reporters.map(formatReporter).join('、')}
              </Text>
            </View>
          )}
          {questionsheet.question_count > 0 && (
            <View className="footer-item footer-question-count">
              <AtIcon value="list" size="14" color="#1890FF" />
              <Text className="footer-text footer-question-text">
                {questionsheet.question_count} 道题目
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="empty-state">
      <View className="empty-icon">📋</View>
      <Text className="empty-title">暂无量表</Text>
      <Text className="empty-desc">当前筛选条件下没有找到量表</Text>
    </View>
  );

  return (
    <>
      <View className="questionnaire-list-page">
        {/* 搜索和分类筛选区 */}
        <View className="search-filter-section">
          {/* 搜索框 */}
          <View className="search-box">
            <AtIcon value="search" size="18" color="#9CA3AF" />
            <Input 
              className="search-input"
              placeholder="搜索量表或症状..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
              onConfirm={handleSearch}
            />
          </View>

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
            <View className="loading-state">
              <AtActivityIndicator mode="center" content="加载中..." />
            </View>
          ) : questionsheetList.length > 0 ? (
            <View className="scale-list">
              {questionsheetList.map(questionsheet =>
                renderQuestionsheetCard(questionsheet)
              )}
              {/* 加载更多提示 */}
              <View className="load-more">
                <Text className="load-more-text">点击加载更多</Text>
                <AtIcon value="chevron-down" size="14" color="#3B82F6" />
              </View>
            </View>
          ) : (
            renderEmptyState()
          )}
        </View>
      </View>

      <BottomMenu activeKey="发现" />
    </>
  );
};

export default QuestionsheetList;
