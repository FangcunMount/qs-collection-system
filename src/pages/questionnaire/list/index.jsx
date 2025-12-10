import React, { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtButton, AtSearchBar, AtTag, AtActivityIndicator } from "taro-ui";

import "./index.less";
import PageContainer from "../../../components/pageContainer/pageContainer";
import { getQuestionsheetList } from "../../../services/api/questionsheetApi";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [questionsheetList, setQuestionsheetList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("全部");

  // 类别列表（可根据实际需求调整）
  const categories = ["全部", "心理评估", "认知评估", "发育评估", "行为评估"];

  useEffect(() => {
    loadQuestionsheetList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, selectedCategory, questionsheetList]);

  const loadQuestionsheetList = async () => {
    try {
      setLoading(true);
      const result = await getQuestionsheetList();
      logger.info("获取量表列表成功", result);
      setQuestionsheetList(result.list || []);
    } catch (error) {
      logger.error("获取量表列表失败", error);
      Taro.showToast({
        title: "加载失败，请重试",
        icon: "none",
        duration: 2000
      });
    } finally {
      setLoading(false);
    }
  };

  const filterList = () => {
    let filtered = questionsheetList;

    // 按类别筛选
    if (selectedCategory !== "全部") {
      filtered = filtered.filter(
        item => item.category === selectedCategory
      );
    }

    // 按搜索关键词筛选
    if (searchValue) {
      filtered = filtered.filter(
        item =>
          item.name?.includes(searchValue) ||
          item.description?.includes(searchValue)
      );
    }

    setFilteredList(filtered);
  };

  const handleSearchChange = value => {
    setSearchValue(value);
  };

  const handleCategoryClick = category => {
    setSelectedCategory(category);
  };

  const handleQuestionsheetClick = questionsheet => {
    logger.info("点击量表", questionsheet);
    const params = {
      qid: questionsheet.code
    };
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", params)
    });
  };

  const renderQuestionsheetCard = questionsheet => (
    <View
      key={questionsheet.code}
      className="questionsheet-card"
      onClick={() => handleQuestionsheetClick(questionsheet)}
    >
      <View className="card-header">
        <Text className="card-title">{questionsheet.name}</Text>
        {questionsheet.category && (
          <AtTag size="small" type="primary" circle>
            {questionsheet.category}
          </AtTag>
        )}
      </View>

      {questionsheet.description && (
        <Text className="card-description">{questionsheet.description}</Text>
      )}

      <View className="card-footer">
        <View className="card-info">
          {questionsheet.question_count && (
            <Text className="info-item">
              📝 {questionsheet.question_count} 题
            </Text>
          )}
          {questionsheet.estimated_time && (
            <Text className="info-item">
              ⏱️ 约 {questionsheet.estimated_time} 分钟
            </Text>
          )}
        </View>
        <Text className="card-action">开始填写 →</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="empty-state">
      <Text className="empty-text">暂无量表数据</Text>
      <AtButton
        type="primary"
        size="small"
        onClick={loadQuestionsheetList}
      >
        重新加载
      </AtButton>
    </View>
  );

  return (
    <PageContainer>
      <View className="questionsheet-list-page">
        {/* 搜索栏 */}
        <View className="search-section">
          <AtSearchBar
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="搜索量表名称或描述"
          />
        </View>

        {/* 分类标签 */}
        <View className="category-section">
          {categories.map(category => (
            <View
              key={category}
              className={`category-tag ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <Text className="category-text">{category}</Text>
            </View>
          ))}
        </View>

        {/* 量表列表 */}
        <View className="list-section">
          {loading ? (
            <View className="loading-container">
              <AtActivityIndicator mode="center" content="加载中..." />
            </View>
          ) : filteredList.length > 0 ? (
            <View className="questionsheet-list">
              {filteredList.map(questionsheet =>
                renderQuestionsheetCard(questionsheet)
              )}
            </View>
          ) : (
            renderEmptyState()
          )}
        </View>
      </View>
    </PageContainer>
  );
};

export default QuestionsheetList;
