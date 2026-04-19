import React, { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, OpenData } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import BottomMenu from "../../../components/bottomMenu";
import { subscribeUserStore, getUserStoreState, initUserStore } from "../../../store/userStore.ts";
import "./index.less";

const UserProfile = () => {
  const [userState, setUserState] = useState(() => getUserStoreState());
  
  // 从 userStore 获取用户信息
  const isLoggedIn = userState.userInfo && userState.userInfo.name;
  const userName = userState.userInfo?.name || userState.userInfo?.nickname || "用户";
  const userAvatar = userState.userInfo?.picture || userState.userInfo?.avatarUrl;
  const userMobile = userState.userInfo?.mobile;
  const canUseWechatOpenData = process.env.TARO_ENV === "weapp";

  // 订阅 userStore 变化
  useEffect(() => {
    const unsubscribe = subscribeUserStore((snapshot) => {
      setUserState(snapshot);
    });

    // 初始化用户数据
    const initState = getUserStoreState();
    if (!initState.isInitialized && !initState.isLoading) {
      initUserStore().catch(err => {
        console.error('[UserProfile] 初始化用户数据失败:', err);
      });
    }

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 功能菜单项
  const menuItems = [
    { id: 1, name: "我的档案", icon: "user", color: "#4A90E2", bgColor: "rgba(74, 144, 226, 0.15)" },
    { id: 2, name: "我的记录", icon: "list", color: "#2ECC71", bgColor: "rgba(46, 204, 113, 0.15)" },
    { id: 3, name: "设置", icon: "settings", color: "#F39C12", bgColor: "rgba(243, 156, 18, 0.15)" }
  ];

  const handleLoginClick = () => {
    Taro.navigateTo({
      url: "/pages/user/register/index"
    });
  };

  const handleMenuItemClick = (item) => {
    // TODO: 根据不同菜单项导航到相应页面
    switch (item.id) {
      case 1: // 个人档案
        Taro.navigateTo({ url: "/pages/testee/list/index" });
        break;
      case 2: // 填写记录
        Taro.navigateTo({ url: "/pages/answersheet/list/index" });
        break;
      case 3: // 设置
        Taro.pageScrollTo({ scrollTop: 9999, duration: 200 });
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

  const handleLogout = () => {
    Taro.showModal({
      title: "退出登录",
      content: "确定要退出当前登录状态吗？",
      success: (res) => {
        if (res.confirm) {
          try {
            Taro.clearStorage();
            Taro.redirectTo({ url: "/pages/user/register/index" });
          } catch (error) {
            Taro.showToast({
              title: "退出失败",
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
        {/* 用户信息卡片 */}
        {isLoggedIn ? (
          <View className="user-info">
            <View className="user-avatar">
              {canUseWechatOpenData ? (
                <OpenData type="userAvatarUrl" className="avatar-open-data" />
              ) : userAvatar ? (
                <image src={userAvatar} className="avatar-img" />
              ) : (
                <Text>👤</Text>
              )}
            </View>
            <View className="user-details">
              <Text className="user-name">{userName}</Text>
              <Text className="user-desc">{userMobile || ''}</Text>
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
              <Text className="login-subtitle">点击登录，享受完整服务</Text>
            </View>
          </View>
        )}
      </View>

      {/* 功能菜单网格 */}
      <View className="menu-section">
        <View className="menu-grid">
          {menuItems.map((item) => (
            <View
              key={item.id}
              className="profile-menu-item"
              onClick={() => handleMenuItemClick(item)}
            >
              <View className="profile-menu-icon" style={{ backgroundColor: item.bgColor }}>
                <AtIcon value={item.icon} size="32" color={item.color} />
              </View>
              <Text className="profile-menu-name">{item.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 操作区域 */}
      <View className="action-section">
        <View className="settings-card">
          <View className="settings-item" onClick={() => Taro.navigateTo({
            url: "/pages/user/subscription/index"
          })}>
            <Text className="settings-item__label">订阅消息管理</Text>
            <AtIcon value="chevron-right" size="18" color="#BFBFBF" />
          </View>
          <View className="settings-item" onClick={handleClearCache}>
            <Text className="settings-item__label">清除缓存</Text>
            <AtIcon value="chevron-right" size="18" color="#BFBFBF" />
          </View>
          <View className="settings-item" onClick={() => Taro.showModal({
            title: "隐私授权说明",
            content: "小程序仅在完成登录、档案管理和测评记录查询时使用必要的身份与档案信息。",
            showCancel: false
          })}>
            <Text className="settings-item__label">隐私授权说明</Text>
            <AtIcon value="chevron-right" size="18" color="#BFBFBF" />
          </View>
        </View>

        {/* 清除缓存按钮 */}
        <View className="clear-cache-btn" onClick={handleLogout}>
          <Text className="clear-cache-text">退出登录</Text>
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
