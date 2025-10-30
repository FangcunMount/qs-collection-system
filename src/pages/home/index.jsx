import React, { useState, useRef, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import { AtButton } from "taro-ui";

import "./index.less";

// 快捷操作入口
const quickActions = [
  {
    label: "开始填写",
    desc: "快速进入问卷填写",
    url: "/pages/questionsheet/index",
    icon: "📝"
  },
  {
    label: "我的答卷",
    desc: "查看历史记录",
    url: "/pages/answersheetList/index",
    icon: "📋"
  },
  {
    label: "数据分析",
    desc: "查看统计报告",
    url: "/pages/analysis/index",
    icon: "📊"
  }
];

// 核心功能特性
const features = [
  {
    icon: "📚",
    title: "专业量表库",
    desc: "内置心理测评、满意度调查等上百种标准量表"
  },
  {
    icon: "📱",
    title: "多端适配",
    desc: "支持微信、H5、PC端，一次创建多端使用"
  },
  {
    icon: "🔒",
    title: "数据安全",
    desc: "银行级加密存储，完善的权限管理体系"
  },
  {
    icon: "📊",
    title: "智能分析",
    desc: "AI驱动的数据分析，自动生成专业报告"
  },
  {
    icon: "⚡",
    title: "实时统计",
    desc: "数据实时同步，支持大规模并发填写"
  },
  {
    icon: "🎨",
    title: "自定义设计",
    desc: "可视化编辑器，支持逻辑跳转和个性化配置"
  },
  {
    icon: "🎯",
    title: "精准投放",
    desc: "支持定向分发，精准触达目标受众群体"
  },
  {
    icon: "💎",
    title: "专业服务",
    desc: "7×24小时技术支持，专业团队全程护航"
  }
];
// 应用场景
const scenarios = [
  {
    title: "心理健康评估",
    items: ["SCL-90量表", "焦虑自评量表", "抑郁自评量表", "心理压力测试", "职业倦怠量表"]
  },
  {
    title: "教育培训调研",
    items: ["课程满意度", "教学质量评估", "学习效果反馈", "培训需求调研", "学生发展评价"]
  },
  {
    title: "企业人力资源",
    items: ["员工满意度", "360度评估", "招聘测评", "绩效考核", "组织氛围调查"]
  },
  {
    title: "市场调研分析",
    items: ["用户体验研究", "产品满意度", "品牌认知度", "消费者行为", "竞品对比分析"]
  },
  {
    title: "医疗健康领域",
    items: ["患者满意度", "医疗服务评价", "健康风险筛查", "康复效果评估", "用药依从性"]
  },
  {
    title: "科研学术调查",
    items: ["问卷调研", "实验数据采集", "文献综述", "社会调查", "学术量表测评"]
  }
];

// 产品优势数据
const advantages = [
  { number: "99.9%", label: "系统可用性" },
  { number: "100万+", label: "累计答卷数" },
  { number: "500+", label: "标准量表" },
  { number: "10000+", label: "服务用户" }
];

const HomeIndex = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animateScreen, setAnimateScreen] = useState(0); // 用于触发动画的屏幕索引

  useEffect(() => {
    // 每次切换屏幕时，延迟触发动画
    const timer = setTimeout(() => {
      setAnimateScreen(currentScreen);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentScreen]);

  const handleNavigate = (url) => {
    Taro.navigateTo({ url });
  };

  // 切换到指定屏幕
  const switchToScreen = (screenIndex) => {
    if (screenIndex < 0 || screenIndex > 2 || isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentScreen(screenIndex);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  // 触摸开始
  const handleTouchStart = (e) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);
  };

  // 触摸结束，判断方向
  const handleTouchEnd = (e) => {
    if (isTransitioning) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    const threshold = 50; // 滑动阈值
    
    if (Math.abs(diff) < threshold) return;
    
    if (diff > 0 && currentScreen < 2) {
      // 向上滑动 -> 下一屏
      switchToScreen(currentScreen + 1);
    } else if (diff < 0 && currentScreen > 0) {
      // 向下滑动 -> 上一屏
      switchToScreen(currentScreen - 1);
    }
  };

  // 鼠标滚轮事件
  useEffect(() => {
    let wheelTimer = null;
    
    const handleWheel = (e) => {
      if (isTransitioning) return;
      
      e.preventDefault();
      
      // 防抖处理
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (e.deltaY > 0 && currentScreen < 2) {
          switchToScreen(currentScreen + 1);
        } else if (e.deltaY < 0 && currentScreen > 0) {
          switchToScreen(currentScreen - 1);
        }
      }, 50);
    };

    if (process.env.TARO_ENV === 'h5') {
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        window.removeEventListener('wheel', handleWheel);
        clearTimeout(wheelTimer);
      };
    }
  }, [currentScreen, isTransitioning]);

  return (
    <View 
      className="home-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 屏幕指示器 */}
      <View className="screen-indicator">
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            className={`indicator-dot ${currentScreen === index ? 'active' : ''}`}
            onClick={() => switchToScreen(index)}
          />
        ))}
      </View>

      {/* 屏幕容器 */}
      <View 
        className="home-screens-wrapper"
        style={{ transform: `translateY(-${currentScreen * 100}vh)` }}
      >
        {/* 首屏：Hero 区域 + 数据统计 */}
        <View className="home-screen home-screen--first">
          <View className={`home-hero ${animateScreen === 0 ? 'animate-in' : ''}`}>
            <View className="home-hero__badge animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              专业问卷&量表系统
            </View>
            <Text className="home-hero__title animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              智能问卷收集平台
            </Text>
            <Text className="home-hero__subtitle animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              为科研、教育、企业、心理健康等领域
              {'\n'}
              提供专业的数据收集与分析服务
            </Text>
            
            {/* 快捷操作卡片 */}
            <View className="home-quick-actions">
              {quickActions.map((action, index) => (
                <View 
                  key={action.label} 
                  className="quick-action-card animate-fade-in-up"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  onClick={() => handleNavigate(action.url)}
                >
                  <Text className="quick-action-card__icon">{action.icon}</Text>
                  <Text className="quick-action-card__label">{action.label}</Text>
                  <Text className="quick-action-card__desc">{action.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 数据统计 */}
          <View className={`home-stats ${animateScreen === 0 ? 'animate-in' : ''}`}>
            <View className="stats-grid">
              {advantages.map((item, index) => (
                <View 
                  key={item.label} 
                  className="stat-item animate-scale-in"
                  style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                >
                  <Text className="stat-item__number">{item.number}</Text>
                  <Text className="stat-item__label">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 次屏：核心功能 */}
        <View className="home-screen home-screen--second">
          <View className={`section-header ${animateScreen === 1 ? 'animate-in' : ''}`}>
            <Text className="section-header__title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              核心功能
            </Text>
            <Text className="section-header__subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              为您提供全方位的问卷解决方案
            </Text>
          </View>
          
          <View className={`feature-grid ${animateScreen === 1 ? 'animate-in' : ''}`}>
            {features.map((feature, index) => (
              <View 
                key={feature.title} 
                className="feature-card animate-fade-in-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <Text className="feature-card__icon">{feature.icon}</Text>
                <Text className="feature-card__title">{feature.title}</Text>
                <Text className="feature-card__desc">{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 三屏：应用场景 */}
        <View className="home-screen home-screen--third">
          <View className={`section-header ${animateScreen === 2 ? 'animate-in' : ''}`}>
            <Text className="section-header__title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              应用场景
            </Text>
            <Text className="section-header__subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              广泛适用于多个专业领域
            </Text>
          </View>
          
          <View className={`scenario-grid ${animateScreen === 2 ? 'animate-in' : ''}`}>
            {scenarios.map((scenario, index) => (
              <View 
                key={scenario.title} 
                className="scenario-card animate-fade-in-up"
                style={{ animationDelay: `${0.3 + index * 0.15}s` }}
              >
                <Text className="scenario-card__title">{scenario.title}</Text>
                <View className="scenario-card__tags">
                  {scenario.items.map((item) => (
                    <Text key={item} className="scenario-tag">{item}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomeIndex;
