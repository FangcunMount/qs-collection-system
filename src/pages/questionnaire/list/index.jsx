import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input } from "@tarojs/components";
import { AtIcon, AtActivityIndicator, AtTabs, AtTabsPane } from "taro-ui";
import BottomMenu from "../../../components/bottomMenu";

import "./index.less";
import { getQuestionnaires } from "../../../services/api/questionnaireApi";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [questionsheetList, setQuestionsheetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFilterIndex, setCurrentFilterIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  
  // 筛选标签配置
  const filterTabList = [
    { title: "全部" },
    { title: "热门推荐" },
    { title: "仅看免费" },
    { title: "最新上线" }
  ];

  // 页面级下拉刷新
  usePullDownRefresh(async () => {
    await loadQuestionsheetList();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadQuestionsheetList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载问卷列表
  const loadQuestionsheetList = useCallback(async () => {
    try {
      setLoading(true);
      
      const result = await getQuestionnaires(1, 100, undefined, undefined);
      const questionnaires = result.items || result.questionnaires || [];
      
      const formattedList = questionnaires.map(item => ({
        code: item.code,
        name: item.title || item.name,
        description: item.description || "专业心理测评工具，帮助您了解心理健康状况。",
        category: item.category || item.tags?.[0] || "心理测评",
        question_count: item.question_count || item.questions?.length || 20,
        test_count: Math.floor(Math.random() * 15000) + 1000, // 模拟已测人数
        is_hot: Math.random() > 0.6, // 热门标签
        is_free: Math.random() > 0.5, // 免费标签
        is_new: Math.random() > 0.8, // 最新标签
        age_group: ["成人", "全年龄", "16岁+", "职场人"][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 15) + 5, // 测试时长
        status: item.status
      }));
      
      setQuestionsheetList(formattedList);
    } catch (error) {
      Taro.showToast({
        title: "加载失败，请重试",
        icon: "none",
        duration: 2000
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理筛选切换
  const handleFilterChange = useCallback((index) => {
    setCurrentFilterIndex(index);
    // TODO: 根据筛选条件过滤问卷列表
  }, []);

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

  const renderQuestionsheetCard = questionsheet => (
    <View
      key={questionsheet.code}
      className="scale-card"
      onClick={() => handleQuestionsheetClick(questionsheet)}
    >
      {/* 标题和标签行 */}
      <View className="scale-header">
        <Text className="scale-title">{questionsheet.name}</Text>
        <View className="scale-tags">
          {questionsheet.is_hot && (
            <View className="tag tag-hot">热门</View>
          )}
          {questionsheet.is_free && (
            <View className="tag tag-free">免费</View>
          )}
          {questionsheet.is_new && (
            <View className="tag tag-new">最新</View>
          )}
        </View>
      </View>

      {/* 描述 */}
      <Text className="scale-desc">{questionsheet.description}</Text>

      {/* 元信息行 */}
      <View className="scale-meta">
        <View className="meta-item">
          <AtIcon value="user" size="14" color="#9CA3AF" />
          <Text className="meta-text">{questionsheet.age_group}</Text>
        </View>
        <View className="meta-item">
          <AtIcon value="clock" size="14" color="#9CA3AF" />
          <Text className="meta-text">{questionsheet.question_count}题 | 约{questionsheet.duration}分</Text>
        </View>
        <View className="meta-hot">
          <AtIcon value="star" size="12" color="#F97316" />
          <Text className="meta-hot-text">{formatCount(questionsheet.test_count)}</Text>
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
        {/* 搜索和筛选区 */}
        <View className="search-filter-section">
          {/* 搜索框 */}
          <View className="search-box">
            <AtIcon value="search" size="18" color="#9CA3AF" />
            <Input 
              className="search-input"
              placeholder="搜索量表或症状..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>

          {/* 筛选标签栏 */}
          <View className="filter-tabs">
            <View className="filter-btn">
              <AtIcon value="filter" size="16" color="#4B5563" />
              <Text className="filter-text">筛选</Text>
            </View>
            <AtTabs
              scroll
              current={currentFilterIndex}
              tabList={filterTabList}
              onClick={handleFilterChange}
            >
              {filterTabList.map((tab, index) => (
                <AtTabsPane key={index} current={currentFilterIndex} index={index}>
                  {/* 占位，实际内容在下方量表列表 */}
                </AtTabsPane>
              ))}
            </AtTabs>
          </View>
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
