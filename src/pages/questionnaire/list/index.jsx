import React, { useEffect, useState, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtActivityIndicator } from "taro-ui";
import BottomMenu from "../../../components/bottomMenu";

import "./index.less";
import PageContainer from "../../../components/pageContainer/pageContainer";
import { getQuestionnaires } from "../../../services/api/questionnaireApi";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [questionsheetList, setQuestionsheetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("全部");
  
  // 分类标签
  const categories = ["全部", "AI访谈", "儿童", "青少年", "成人"];

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
      console.log("问卷列表结果：", result);
      const questionnaires = result.items || result.questionnaires || [];
      
      const formattedList = questionnaires.map(item => ({
        code: item.code,
        name: item.title || item.name,
        description: item.description,
        category: item.category || item.tags?.[0] || "心理测评",
        question_count: item.question_count || item.questions?.length,
        test_count: Math.floor(Math.random() * 5000) + 1000, // 模拟已测人数
        is_new: Math.random() > 0.7, // 模拟新人权益
        thumbnail: item.thumbnail || `https://picsum.photos/seed/${item.code}/200/200`, // 使用缩略图或生成随机图片
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

  // 处理分类切换
  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
    // TODO: 根据分类筛选问卷列表
  }, []);

  const handleQuestionsheetClick = questionsheet => {
    logger.RUN("点击量表", questionsheet);
    const params = {
      q: questionsheet.code  // 使用 q 作为参数名，与填写页面保持一致
    };
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", params)
    });
  };

  const renderQuestionsheetCard = questionsheet => (
    <View
      key={questionsheet.code}
      className="questionnaire-card"
      onClick={() => handleQuestionsheetClick(questionsheet)}
    >
      <View className="card-info">
        <Text className="card-title">{questionsheet.name}</Text>
        <Text className="card-desc">{questionsheet.category}</Text>
        <View className="card-meta">
          <Text className="meta-text">{questionsheet.test_count}人已测</Text>
        </View>
      </View>
      <View className="card-btn">
        <Text className="btn-text">开始测试</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="empty">
      <View className="empty-icon">📋</View>
      <Text className="empty-title">暂无问卷</Text>
      <Text className="empty-desc">问卷列表为空，请稍后重试</Text>
      <View className="empty-btn" onClick={() => loadQuestionsheetList()}>
        <Text className="empty-btn-text">刷新</Text>
      </View>
    </View>
  );

  return (
    <PageContainer>
      <View className="questionnaire-list-page">

        {/* 分类标签 */}
        <View className="category-tabs">
          {categories.map(category => (
            <View
              key={category}
              className={`category-tab ${activeCategory === category ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category)}
            >
              <Text className="category-text">{category}</Text>
              {activeCategory === category && (
                <View className="category-underline" />
              )}
            </View>
          ))}
        </View>

        {/* 问卷列表 */}
        <View className="list-container">
          {loading ? (
            <View className="loading">
              <AtActivityIndicator mode="center" content="加载中..." />
            </View>
          ) : questionsheetList.length > 0 ? (
            <View className="questionnaire-list">
              {questionsheetList.map(questionsheet =>
                renderQuestionsheetCard(questionsheet)
              )}
            </View>
          ) : (
            renderEmptyState()
          )}
        </View>
      </View>

      <BottomMenu activeKey="发现" />
    </PageContainer>
  );
};

export default QuestionsheetList;
