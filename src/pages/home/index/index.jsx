import React, { useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, ScrollView } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";

import BottomMenu from "../../../components/bottomMenu";
import "./index.less";

// 量表分类 (2x4网格布局)
const categories = [
  { id: 1, name: "心理健康", icon: "heart", iconType: "outlined" },
  { id: 2, name: "睡眠评估", icon: "iphone", iconType: "outlined" },
  { id: 3, name: "慢性病管理", icon: "heart-2", iconType: "outlined" },
  { id: 4, name: "儿童发育", icon: "user", iconType: "outlined" },
  { id: 5, name: "认知筛查", icon: "lightbulb", iconType: "outlined" },
  { id: 6, name: "疼痛评估", icon: "alert-circle", iconType: "outlined" },
  { id: 7, name: "生活质量", icon: "star", iconType: "outlined" },
  { id: 8, name: "成瘾评估", icon: "blocked", iconType: "outlined" },
];

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

  const handleCategoryClick = (category) => {
    console.log("分类点击:", category.name);
    // 跳转到量表列表，按分类筛选
    Taro.navigateTo({ 
      url: `/pages/questionnaire/list/index?category=${category.name}` 
    });
  };

  const handleScaleClick = (scale) => {
    console.log("量表点击:", scale.title);
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
          <View className="category-grid">
            {categories.map((cat) => (
              <View
                key={cat.id}
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
