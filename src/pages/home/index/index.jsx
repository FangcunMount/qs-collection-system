import React, { useState, useEffect, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";

import BottomMenu from "../../../components/bottomMenu";
import { SearchBox } from "../../../components/common";
import LoadingState from "../../common/components/LoadingState/LoadingState";
import { getScales, getScaleCategories } from "../../../services/api/scaleApi";
import { paramsConcat } from "../../../util";
import "./index.less";
import {
  getEntryContext,
  getSelectedTesteeId,
  findTesteeById,
  subscribeEntryContext,
  subscribeTesteeStore
} from "../../../store";

/**
 * 量表分类配置（写死数据）
 * 每个分类包含：value（分类值）、label（显示名称）、icon（图标名称）
 * 图标均使用项目中已验证存在的 taro-ui 图标
 */
const SCALE_CATEGORIES = [
  { value: "adhd", label: "多动", icon: "bookmark" },                  
  { value: "td", label: "抽动", icon: "alert-circle" },              
  { value: "asd", label: "自闭", icon: "user" },                    
  { value: "sii", label: "感觉统合", icon: "settings" },                 
  { value: "efn", label: "执行功能", icon: "list" },                    
  { value: "emt", label: "情绪", icon: "heart" },                  
  { value: "slp", label: "睡眠", icon: "clock" },                  
  { value: "pressure", label: "压力", icon: "alert-circle" },      
  { value: "personality", label: "人格", icon: "sketch" },
  { value: "mbti", label: "MBTI", icon: "bookmark" },    
];

const normalizeCategoryValue = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.value || item.code || item.name || item.label || item.id || "";
};

const buildCategoryItems = (availableCategories) => {
  const values = (availableCategories || [])
    .map(normalizeCategoryValue)
    .filter(Boolean);
  const availableSet = new Set(values);

  return SCALE_CATEGORIES
    .filter((cat) => availableSet.has(cat.value) || availableSet.has(cat.label))
    .map((cat, index) => ({
      id: cat.value || index,
      name: cat.label,
      value: cat.value,
      icon: cat.icon,
      iconType: "outlined"
    }));
};

const HomeIndex = () => {
  const [searchText, setSearchText] = useState("");
  const [recommendedScales, setRecommendedScales] = useState([]);
  const [recommendedScalesLoading, setRecommendedScalesLoading] = useState(true);
  const [categoryItems, setCategoryItems] = useState([]);
  const [entryContext, setEntryContext] = useState(() => getEntryContext());
  const [currentTestee, setCurrentTestee] = useState(() => {
    const selectedId = getSelectedTesteeId();
    return selectedId ? findTesteeById(selectedId) : null;
  });
  
  const loadScaleCategories = useCallback(async () => {
    try {
      const result = await getScaleCategories();
      const categories = result.data?.categories || result.categories || [];
      setCategoryItems(buildCategoryItems(categories));
    } catch (error) {
      console.error("加载量表分类失败:", error);
      setCategoryItems([]);
    }
  }, []);

  const handleCategoryClick = (category) => {
    // 跳转到量表列表，按分类筛选
    // 使用 value 作为筛选条件，如果没有 value 则使用 name
    const categoryValue = category.value || category.name;
    Taro.navigateTo({ 
      url: `/pages/questionnaire/list/index?category=${encodeURIComponent(categoryValue)}` 
    });
  };

  const handleScaleClick = (scale) => {
    const params = {
      q: scale.id
    };
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", params)
    });
  };

  const handleContinueEntry = () => {
    const nextCode = entryContext?.q || entryContext?.target_code;
    if (!nextCode) return;
    Taro.navigateTo({
      url: paramsConcat("/pages/questionnaire/fill/index", { q: nextCode, t: currentTestee?.id })
    });
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      Taro.navigateTo({ 
        url: `/pages/questionnaire/list/index?keyword=${searchText}` 
      });
    }
  };


  // 加载推荐量表列表（获取前10个，随机选择3个）
  const loadRecommendedScales = useCallback(async () => {
    try {
      setRecommendedScalesLoading(true);
      const result = await getScales({ page: 1, pageSize: 10 });
      const scales = result.data?.scales || result.scales || [];
      
      // 随机选择3个
      const shuffled = [...scales].sort(() => Math.random() - 0.5);
      const selectedScales = shuffled.slice(0, 3);
      
      // 格式化数据
      const formattedScales = selectedScales.map((item) => {
        // 根据题目数量估算时长（假设每题约0.5分钟）
        const questionCount = item.question_count || 0;
        const estimatedMinutes = Math.max(3, Math.ceil(questionCount * 0.5));
        const duration = `约${estimatedMinutes}分钟`;
        
        return {
          id: item.code,
          title: item.title,
          desc: item.description || "专业心理测评工具，帮助您了解心理健康状况。",
          duration: duration,
        };
      });
      
      setRecommendedScales(formattedScales);
    } catch (error) {
      console.error('加载推荐量表失败:', error);
      // 失败时不显示错误提示，避免影响用户体验
      setRecommendedScales([]);
    } finally {
      setRecommendedScalesLoading(false);
    }
  }, []);

  // 页面级下拉刷新
  usePullDownRefresh(async () => {
    await loadRecommendedScales();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadRecommendedScales();
    loadScaleCategories();
  }, [loadRecommendedScales, loadScaleCategories]);

  useEffect(() => {
    const unsubscribeEntry = subscribeEntryContext((snapshot) => {
      setEntryContext(snapshot);
    });
    const unsubscribeTestee = subscribeTesteeStore(({ selectedTesteeId }) => {
      setCurrentTestee(selectedTesteeId ? findTesteeById(selectedTesteeId) : null);
    });
    return () => {
      unsubscribeEntry();
      unsubscribeTestee();
    };
  }, []);

  return (
    <View className="home-page">
      {/* 顶部标题栏 */}

      {/* 可滚动内容区 */}
      <ScrollView scrollY className="home-content">
        {/* 欢迎与搜索模块 */}
        <View className="welcome-section">
          <View onClick={handleSearch}>
            <SearchBox
              placeholder="搜索量表名称..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
              onConfirm={handleSearch}
            />
          </View>
        </View>

        {(entryContext?.entry_title || entryContext?.clinician_name) && (
          <View className="entry-context-panel" onClick={handleContinueEntry}>
            <View className="entry-context-panel__header">
              <Text className="entry-context-panel__eyebrow">最近入口</Text>
              <Text className="entry-context-panel__action">继续填写</Text>
            </View>
            {entryContext?.entry_title && (
              <Text className="entry-context-panel__title">{entryContext.entry_title}</Text>
            )}
            {(entryContext?.clinician_name || entryContext?.clinician_title) && (
              <Text className="entry-context-panel__meta">
                {entryContext?.clinician_name || '临床人员'}
                {entryContext?.clinician_title ? ` · ${entryContext.clinician_title}` : ''}
              </Text>
            )}
            {entryContext?.entry_description && (
              <Text className="entry-context-panel__desc">{entryContext.entry_description}</Text>
            )}
          </View>
        )}

        {currentTestee && (
          <View
            className="current-testee-panel"
            onClick={() => Taro.navigateTo({ url: "/pages/testee/list/index" })}
          >
            <View className="current-testee-panel__header">
              <Text className="current-testee-panel__eyebrow">当前档案</Text>
              <Text className="current-testee-panel__action">管理档案</Text>
            </View>
            <Text className="current-testee-panel__title">
              {currentTestee.legalName || currentTestee.name || '未命名'}
            </Text>
            <Text className="current-testee-panel__meta">
              {currentTestee.gender === 1 ? '男' : currentTestee.gender === 2 ? '女' : '其他'}
              {currentTestee.dob ? ` · ${currentTestee.dob}` : ''}
            </Text>
          </View>
        )}

        {/* 量表分类导航 */}
        <View className="category-section">
          <Text className="section-title">量表分类</Text>
          <View className="category-grid">
            {categoryItems.map((cat) => (
              <View
                key={cat.id || cat.value}
                className="category-item"
                onClick={() => handleCategoryClick(cat)}
              >
                <AtIcon value={cat.icon} size="28" color="#1890FF" className="category-icon" />
                <Text className="category-name">{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 热门推荐量表 */}
        <View className="recommend-section">
          <View className="section-header">
            <Text className="section-title">专业精选</Text>
            <View 
              className="section-more"
              onClick={() => Taro.navigateTo({ url: "/pages/questionnaire/list/index" })}
            >
              <Text className="more-text">更多</Text>
              <AtIcon value="chevron-right" size="16" color="currentColor" />
            </View>
          </View>
          
          {recommendedScalesLoading ? (
            <LoadingState content="加载中..." />
          ) : recommendedScales.length > 0 ? (
            <View className="scale-list">
              {recommendedScales.map((scale, index) => (
                <View 
                  key={scale.id} 
                  className="scale-card"
                  onClick={() => handleScaleClick(scale)}
                >
                  <View className="scale-card-left" />
                  <View className="scale-card-content">
                    <View className="scale-header">
                      <Text className="scale-title">{scale.title}</Text>
                    </View>
                    <Text className="scale-desc">{scale.desc}</Text>
                    <View className="scale-meta">
                      <AtIcon value="clock" size="14" className="meta-icon" />
                      <Text className="meta-text">{scale.duration}</Text>
                    </View>
                  </View>
                  <View className="scale-card-arrow">
                    <AtIcon value="chevron-right" size="18" className="scale-arrow" />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="recommend-empty">
              <Text className="empty-text">暂无推荐量表</Text>
            </View>
          )}
        </View>

        {/* 底部占位 */}
        <View style={{ height: "140rpx" }} />
      </ScrollView>

      {/* 底部菜单栏 */}
      <BottomMenu activeKey="首页" />
    </View>
  );
};

export default HomeIndex;
