import React, { useState, useEffect, useCallback } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input, ScrollView } from "@tarojs/components";
import { AtIcon, AtActivityIndicator } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";

import BottomMenu from "../../../components/bottomMenu";
import { getScaleCategories } from "../../../services/api/scaleApi";
import "./index.less";

/**
 * 分类图标映射配置
 * 支持多种匹配方式：精确匹配、关键词匹配、模糊匹配
 */
const CATEGORY_ICON_CONFIG = {
  // 精确匹配（优先级最高）
  exact: {
    "心理健康": "heart",
    "心理": "heart",
    "睡眠评估": "iphone",
    "睡眠": "iphone",
    "慢性病管理": "heart-2",
    "慢性病": "heart-2",
    "儿童发育": "user",
    "儿童": "user",
    "认知筛查": "bookmark",
    "认知": "bookmark",
    "疼痛评估": "alert-circle",
    "疼痛": "alert-circle",
    "生活质量": "star",
    "成瘾评估": "blocked",
    "成瘾": "blocked",
    "焦虑": "heart",
    "抑郁": "heart-2",
    "发育": "user",
    "情绪": "heart",
    "情感": "heart",
    "行为": "alert-circle",
    "社交": "user",
    "学习": "bookmark",
    "注意力": "bookmark",
    "多动": "alert-circle",
    "自闭": "user",
    "孤独症": "user",
    "智力": "bookmark",
    "记忆": "bookmark",
    "语言": "user",
    "运动": "alert-circle",
    "感觉": "alert-circle",
    "适应": "user",
    "学校": "bookmark",
    "家庭": "user",
    "同伴": "user",
    "自我": "heart",
    "自尊": "heart",
    "压力": "heart-2",
    "创伤": "heart-2",
    "应激": "heart-2",
    "人格": "heart",
    "性格": "heart",
  },
  
  // 关键词匹配（优先级中等）
  keywords: [
    { keywords: ["心理", "情绪", "情感", "抑郁", "焦虑", "压力", "创伤", "应激", "人格", "性格", "自我", "自尊"], icon: "heart" },
    { keywords: ["睡眠", "失眠", "嗜睡", "梦", "休息"], icon: "iphone" },
    { keywords: ["慢性", "疾病", "病", "健康", "医疗"], icon: "heart-2" },
    { keywords: ["儿童", "幼儿", "青少年", "少年", "学生", "孩子", "小孩"], icon: "user" },
    { keywords: ["认知", "智力", "记忆", "学习", "注意力", "专注", "思维", "思考"], icon: "bookmark" },
    { keywords: ["疼痛", "痛", "不适", "症状", "行为", "多动", "感觉"], icon: "alert-circle" },
    { keywords: ["质量", "生活", "适应", "社会", "功能"], icon: "star" },
    { keywords: ["成瘾", "依赖", "戒断"], icon: "blocked" },
    { keywords: ["发育", "成长", "发展", "成熟"], icon: "user" },
    { keywords: ["社交", "人际", "关系", "同伴", "朋友", "沟通", "交流"], icon: "user" },
    { keywords: ["学校", "学业", "教育", "教学"], icon: "bookmark" },
    { keywords: ["家庭", "父母", "亲子", "养育"], icon: "user" },
    { keywords: ["自闭", "孤独", "谱系"], icon: "user" },
    { keywords: ["语言", "说话", "表达", "沟通"], icon: "user" },
    { keywords: ["运动", "动作", "协调", "平衡"], icon: "alert-circle" },
  ],
  
  // 默认图标池（按类别分组，用于循环分配）
  defaultPools: [
    ["heart", "heart-2"],           // 心理相关
    ["iphone", "clock"],            // 时间/睡眠相关
    ["user", "user-circle"],        // 人群相关
    ["bookmark", "book"],           // 学习/认知相关
    ["alert-circle", "info"],       // 评估/症状相关
    ["star", "tag"],                // 质量/标签相关
    ["blocked", "close"],           // 成瘾/禁止相关
  ],
};

/**
 * 获取分类图标
 * @param {string} categoryLabel - 分类标签
 * @param {string} categoryValue - 分类值
 * @param {number} index - 索引（用于默认图标分配）
 * @returns {string} 图标名称
 */
const getCategoryIcon = (categoryLabel, categoryValue, index) => {
  const searchText = (categoryLabel || categoryValue || "").toLowerCase().trim();
  
  if (!searchText) {
    return getDefaultIcon(index);
  }
  
  // 1. 精确匹配（最高优先级）
  const exactMatch = CATEGORY_ICON_CONFIG.exact[searchText] || 
                     CATEGORY_ICON_CONFIG.exact[categoryLabel] ||
                     CATEGORY_ICON_CONFIG.exact[categoryValue];
  if (exactMatch) {
    return exactMatch;
  }
  
  // 2. 关键词匹配
  for (const { keywords, icon } of CATEGORY_ICON_CONFIG.keywords) {
    if (keywords.some(keyword => searchText.includes(keyword) || keyword.includes(searchText))) {
      return icon;
    }
  }
  
  // 3. 模糊匹配（部分包含）
  for (const [key, icon] of Object.entries(CATEGORY_ICON_CONFIG.exact)) {
    if (searchText.includes(key) || key.includes(searchText)) {
      return icon;
    }
  }
  
  // 4. 使用默认图标（根据索引循环分配）
  return getDefaultIcon(index);
};

/**
 * 获取默认图标（根据索引从图标池中循环选择）
 * @param {number} index - 索引
 * @returns {string} 图标名称
 */
const getDefaultIcon = (index) => {
  const poolIndex = index % CATEGORY_ICON_CONFIG.defaultPools.length;
  const pool = CATEGORY_ICON_CONFIG.defaultPools[poolIndex];
  const iconIndex = Math.floor(index / CATEGORY_ICON_CONFIG.defaultPools.length) % pool.length;
  return pool[iconIndex];
};

// 热门推荐量表 (3-4个卡片)
const recommendedScales = [
  {
    id: "phq9",
    title: "PHQ-9抑郁症筛查量表",
    desc: "用于评估抑郁症状的严重程度",
    duration: "约5分钟",
  },
  {
    id: "gad7",
    title: "GAD-7焦虑量表",
    desc: "广泛性焦虑障碍的筛查工具",
    duration: "约3分钟",
  },
  {
    id: "psqi",
    title: "PSQI睡眠质量指数量表",
    desc: "评估近1个月的睡眠质量状况",
    duration: "约8分钟",
  },
];

const HomeIndex = () => {
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const handleCategoryClick = (category) => {
    // 跳转到量表列表，按分类筛选
    // 使用 value 作为筛选条件，如果没有 value 则使用 name
    const categoryValue = category.value || category.name;
    Taro.navigateTo({ 
      url: `/pages/questionnaire/list/index?category=${encodeURIComponent(categoryValue)}` 
    });
  };

  const handleScaleClick = (scale) => {
    // TODO: 跳转到量表填写页面
    Taro.navigateTo({ 
      url: `/pages/questionnaire/fill/index?code=${scale.id}` 
    });
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      Taro.navigateTo({ 
        url: `/pages/questionnaire/list/index?keyword=${searchText}` 
      });
    }
  };

  // 加载量表分类
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const result = await getScaleCategories();
      const categoryList = (result.categories || []).map((cat, index) => ({
        id: cat.value || index,
        name: cat.label || cat.value,
        value: cat.value,
        icon: getCategoryIcon(cat.label, cat.value, index),
        iconType: "outlined"
      }));
      // 最多显示 8 个分类
      setCategories(categoryList.slice(0, 8));
    } catch (error) {
      console.error('加载分类失败:', error);
      Taro.showToast({
        title: "加载分类失败",
        icon: "none",
        duration: 2000
      });
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // 页面级下拉刷新
  usePullDownRefresh(async () => {
    await loadCategories();
    Taro.stopPullDownRefresh();
  });

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <View className="home-page">
      {/* 顶部标题栏 */}

      {/* 可滚动内容区 */}
      <ScrollView scrollY className="home-content">
        {/* 欢迎与搜索模块 */}
        <View className="welcome-section">
          
          <View className="search-bar" onClick={handleSearch}>
            <AtIcon value="search" size="20" color="#8c8c8c" className="search-icon" />
            <Input
              className="search-input"
              placeholder="搜索量表名称或症状..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
              onConfirm={handleSearch}
            />
          </View>
        </View>

        {/* 量表分类导航 */}
        <View className="category-section">
          <Text className="section-title">量表分类</Text>
          {categoriesLoading ? (
            <View className="category-loading">
              <AtActivityIndicator mode="center" content="加载中..." />
            </View>
          ) : categories.length > 0 ? (
            <View className="category-grid">
              {categories.map((cat) => (
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
          ) : (
            <View className="category-empty">
              <Text className="empty-text">暂无分类数据</Text>
            </View>
          )}
        </View>

        {/* 热门推荐量表 */}
        <View className="recommend-section">
          <View className="section-header">
            <Text className="section-title">专业精选</Text>
            <Text 
              className="section-more"
              onClick={() => Taro.navigateTo({ url: "/pages/questionnaire/list/index" })}
            >
              更多
            </Text>
          </View>
          
          <View className="scale-list">
            {recommendedScales.map((scale) => (
              <View key={scale.id} className="scale-card">
                <View className="scale-info">
                  <Text className="scale-title">{scale.title}</Text>
                  <Text className="scale-desc">{scale.desc}</Text>
                  <View className="scale-meta">
                    <AtIcon value="clock" size="14" color="#8c8c8c" className="meta-icon" />
                    <Text className="meta-text">{scale.duration}</Text>
                  </View>
                </View>
                <View 
                  className="scale-btn"
                  onClick={() => handleScaleClick(scale)}
                >
                  <Text className="btn-text">开始测试</Text>
                </View>
              </View>
            ))}
          </View>
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
