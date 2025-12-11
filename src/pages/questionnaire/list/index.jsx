import React, { useEffect, useState, useRef, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input } from "@tarojs/components";
import { AtActivityIndicator } from "taro-ui";

import "./index.less";
import PageContainer from "../../../components/pageContainer/pageContainer";
import { getQuestionnaires } from "../../../services/api/questionnaireApi";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "questionsheet_list";
const logger = getLogger(PAGE_NAME);

const QuestionsheetList = () => {
  const [questionsheetList, setQuestionsheetList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // 页面级下拉刷新
  usePullDownRefresh(async () => {
    await loadQuestionsheetList(searchValue);
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadQuestionsheetList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载问卷列表
  const loadQuestionsheetList = useCallback(async (keyword = "") => {
    try {
      if (keyword) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      
      const result = await getQuestionnaires(1, 20, undefined, keyword || undefined);
      console.log("问卷列表结果：", result);
      const questionnaires = result.items || result.questionnaires || [];
      
      const formattedList = questionnaires.map(item => ({
        code: item.code,
        name: item.title || item.name,
        description: item.description,
        category: item.category || item.tags?.[0],
        question_count: item.question_count || item.questions?.length,
        estimated_time: item.estimated_time,
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
      setSearching(false);
    }
  }, []);

  // 搜索防抖
  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
    
    // 清除之前的定时器
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // 设置新的定时器，500ms 后执行搜索
    searchTimerRef.current = setTimeout(() => {
      loadQuestionsheetList(value);
    }, 500);
  }, [loadQuestionsheetList]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const handleQuestionsheetClick = questionsheet => {
    logger.RUN("点击量表", questionsheet);
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
      className="card"
      onClick={() => handleQuestionsheetClick(questionsheet)}
    >
      <View className="card-body">
        <Text className="card-title">{questionsheet.name}</Text>
        {questionsheet.description && (
          <Text className="card-desc">{questionsheet.description}</Text>
        )}
        <View className="card-footer">
          <View className="card-tags">
            {questionsheet.question_count && (
              <View className="tag">
                <Text className="tag-text">{questionsheet.question_count} 题</Text>
              </View>
            )}
            {questionsheet.estimated_time && (
              <View className="tag">
                <Text className="tag-text">约 {questionsheet.estimated_time} 分钟</Text>
              </View>
            )}
          </View>
          <View className="card-action">
            <Text className="action-text">开始填写</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="empty">
      <View className="empty-icon">{searchValue ? '🔍' : '📋'}</View>
      <Text className="empty-title">{searchValue ? '未找到相关问卷' : '暂无问卷'}</Text>
      <Text className="empty-desc">{searchValue ? '请尝试其他关键词' : '问卷列表为空，请稍后重试'}</Text>
      {!searchValue && (
        <View className="empty-btn" onClick={() => loadQuestionsheetList()}>
          <Text className="empty-btn-text">刷新</Text>
        </View>
      )}
    </View>
  );

  return (
    <PageContainer>
      <View className="page">
        {/* 搜索栏 */}
        <View className="search">
          <View className="search-input">
            <Text className="search-icon">🔍</Text>
            <Input
              className="search-field"
              placeholder="搜索问卷名称"
              value={searchValue}
              onInput={e => handleSearchChange(e.detail.value)}
            />
            {searching && (
              <AtActivityIndicator size={32} />
            )}
            {!searching && searchValue && (
              <Text
                className="search-clear"
                onClick={() => {
                  setSearchValue('');
                  loadQuestionsheetList();
                }}
              >
                ✕
              </Text>
            )}
          </View>
        </View>

        {/* 问卷列表 */}
        <View className="list">
          {loading ? (
            <View className="loading">
              <AtActivityIndicator mode="center" content="加载中..." />
            </View>
          ) : questionsheetList.length > 0 ? (
            <View className="cards">
              {questionsheetList.map(questionsheet =>
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
