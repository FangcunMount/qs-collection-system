import React, { useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";

import BottomMenu from "../../../components/bottomMenu";
import "./index.less";

const UserProfile = () => {
  const [isLoggedIn] = useState(false); // 默认未登录

  // 功能菜单项
  const menuItems = [
    { id: 1, name: "个人档案", icon: "user", color: "#4A90E2", bgColor: "rgba(74, 144, 226, 0.15)" },
    { id: 2, name: "填写记录", icon: "list", color: "#2ECC71", bgColor: "rgba(46, 204, 113, 0.15)" },
    { id: 3, name: "测评报告", icon: "bookmark", color: "#9B59B6", bgColor: "rgba(155, 89, 182, 0.15)" },
    { id: 4, name: "收藏记录", icon: "tag", color: "#F39C12", bgColor: "rgba(243, 156, 18, 0.15)" }
  ];

  const handleLoginClick = () => {
    Taro.navigateTo({
      url: "/pages/user/register/index"
    });
  };

  const handleMenuItemClick = (item) => {
    console.log("点击菜单项:", item.name);
    // TODO: 根据不同菜单项导航到相应页面
    switch (item.id) {
      case 1: // 个人档案
        Taro.navigateTo({ url: "/pages/testee/editor/index" });
        break;
      case 2: // 填写记录
        // TODO: 导航到填写记录页面
        break;
      case 3: // 测评报告
        Taro.navigateTo({ url: "/pages/analysis/index" });
        break;
      case 4: // 收藏记录
        // TODO: 导航到收藏记录页面
        break;
      default:
        break;
    }
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: "清除缓存",
      content: "确定要清除所有缓存数据吗？",
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除本地存储
            Taro.clearStorage();
            Taro.showToast({
              title: "缓存已清除",
              icon: "success",
              duration: 2000
            });
          } catch (error) {
            Taro.showToast({
              title: "清除失败",
              icon: "none",
              duration: 2000
            });
          }
        }
      }
    });
  };

  return (
    <View className="user-profile-page">
      {/* 顶部渐变背景区域 */}
      <View className="profile-header">
        {/* 页面标题 */}
        <Text className="page-title">个人中心</Text>

        {/* 用户信息卡片 */}
        {isLoggedIn ? (
          <View className="user-info">
            <View className="user-avatar">
              <Text>👤</Text>
            </View>
            <View className="user-details">
              <Text className="user-name">用户名</Text>
              <Text className="user-desc">点击查看个人信息</Text>
            </View>
          </View>
        ) : (
          <View className="login-card" onClick={handleLoginClick}>
            <View className="login-avatar">
              <Text>👤</Text>
            </View>
            <View className="login-info">
              <View style={{ display: "flex", alignItems: "center" }}>
                <Text className="login-title">登录/注册</Text>
                <AtIcon value="chevron-right" size="20" color="#BFBFBF" className="arrow-icon" />
              </View>
              <Text className="login-subtitle">点击登录，享受完整医疗服务</Text>
            </View>
          </View>
        )}
      </View>

      {/* 功能菜单网格 (4列) */}
      <View className="menu-section">
        <View className="menu-grid">
          {menuItems.map((item) => (
            <View
              key={item.id}
              className="menu-item"
              onClick={() => handleMenuItemClick(item)}
            >
              <View className="menu-icon" style={{ backgroundColor: item.bgColor }}>
                <AtIcon value={item.icon} size="32" color={item.color} />
              </View>
              <Text className="menu-name">{item.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 操作区域 */}
      <View className="action-section">
        {/* 清除缓存按钮 */}
        <View className="clear-cache-btn" onClick={handleClearCache}>
          <Text className="clear-cache-text">清除缓存</Text>
        </View>
        
        {/* 版本信息 */}
        <Text className="version-text">Version 2.4.0</Text>
      </View>

      {/* 底部菜单 */}
      <BottomMenu activeKey="我的" />
    </View>
  );
};

export default UserProfile;
