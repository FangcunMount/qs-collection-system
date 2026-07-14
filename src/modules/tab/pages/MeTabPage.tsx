import React, { useEffect, useState } from "react";
import { Button, Image, OpenData, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import Icon from "@/shared/ui/Icon";
import type { IconName } from "@/shared/ui/Icon";

import { routes } from "@/shared/config/routes";
import { getAccountStoreState, initAccountStore, subscribeAccountStore } from "@/shared/stores/account";
import BottomMenu from "@/shared/ui/BottomMenu";
import PageShell from "@/shared/ui/PageShell";
import ActionButton from "@/shared/ui/ActionButton";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import type { UserStoreState } from "@/store/userStore";
import "./MeTabPage.less";

const menuItems = [
  { id: 1, name: "我的档案", icon: "user", tone: "medical" },
  { id: 2, name: "我的记录", icon: "list", tone: "success" },
  { id: 3, name: "设置", icon: "settings", tone: "warning" },
] as const;

const MeTabPage = () => {
  const [userState, setUserState] = useState<UserStoreState>(() => getAccountStoreState());
  const userInfo = userState.userInfo;
  const isLoggedIn = Boolean(userInfo?.name);
  const userName = userInfo?.name || userInfo?.nickname || "用户";
  const userAvatar = userInfo?.picture || userInfo?.avatarUrl || "";
  const canUseWechatOpenData = process.env.TARO_ENV === "weapp";

  useEffect(() => {
    const unsubscribe = subscribeAccountStore((snapshot: UserStoreState) => setUserState(snapshot));
    const initial = getAccountStoreState();
    if (!initial.isInitialized && !initial.isLoading) {
      initAccountStore().catch((error: unknown) => console.error("[UserProfile] 初始化用户数据失败:", error));
    }
    return unsubscribe;
  }, []);

  const handleMenuItemClick = (id: number) => {
    if (id === 1) Taro.navigateTo({ url: routes.testeeList() });
    if (id === 2) Taro.navigateTo({ url: routes.assessmentRecords() });
    if (id === 3) Taro.pageScrollTo({ scrollTop: 9999, duration: 200 });
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: "清除缓存",
      content: "确定要清除所有缓存数据吗？",
      success: (result) => {
        if (!result.confirm) return;
        try {
          Taro.clearStorage();
          Taro.showToast({ title: "缓存已清除", icon: "success", duration: 2000 });
        } catch (_error: unknown) {
          Taro.showToast({ title: "清除失败", icon: "none", duration: 2000 });
        }
      },
    });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: "退出登录",
      content: "确定要退出当前登录状态吗？",
      success: (result) => {
        if (!result.confirm) return;
        try {
          Taro.clearStorage();
          Taro.redirectTo({ url: routes.accountRegister() });
        } catch (_error: unknown) {
          Taro.showToast({ title: "退出失败", icon: "none", duration: 2000 });
        }
      },
    });
  };

  return (
    <PageShell tone="medical" contentClassName="user-profile-page" bottomInset={false}>
      <View className="profile-header">
        {isLoggedIn ? (
          <View className="user-info">
            <View className="user-avatar">
              {canUseWechatOpenData ? (
                <OpenData type="userAvatarUrl" className="avatar-open-data" />
              ) : userAvatar ? (
                <Image src={userAvatar} className="avatar-img" mode="aspectFill" />
              ) : <Text>👤</Text>}
            </View>
            <View className="user-details">
              <Text className="user-name">{userName}</Text>
              <Text className="user-desc">{userInfo?.mobile || ""}</Text>
            </View>
          </View>
        ) : (
          <SurfaceCard interactive className="login-card" onClick={() => Taro.navigateTo({ url: routes.accountRegister() })}>
            <View className="login-avatar"><Text>👤</Text></View>
            <View className="login-info">
              <View className="login-title-row">
                <Text className="login-title">登录/注册</Text>
                <Icon name="arrow-right" size={20} color="#8A96AA" />
              </View>
              <Text className="login-subtitle">点击登录，享受完整服务</Text>
            </View>
          </SurfaceCard>
        )}
      </View>

      <View className="menu-grid">
        {menuItems.map((item) => (
          <SurfaceCard key={item.id} interactive className="profile-menu-item" onClick={() => handleMenuItemClick(item.id)}>
            <View className={`profile-menu-icon profile-menu-icon--${item.tone}`}>
              <Icon name={item.icon as IconName} size={28} color="#6657D9" />
            </View>
            <Text className="profile-menu-name">{item.name}</Text>
          </SurfaceCard>
        ))}
      </View>

      <View className="action-section">
        <SurfaceCard className="settings-card">
          <Button className="settings-item" onClick={() => Taro.navigateTo({ url: routes.accountSubscription() })}>
            <Text>订阅消息管理</Text><Text className="settings-item__arrow">›</Text>
          </Button>
          <Button className="settings-item" onClick={handleClearCache}>
            <Text>清除缓存</Text><Text className="settings-item__arrow">›</Text>
          </Button>
          <Button className="settings-item" onClick={() => Taro.showModal({
            title: "隐私授权说明",
            content: "小程序仅在完成登录、档案管理和测评记录查询时使用必要的身份与档案信息。",
            showCancel: false,
          })}>
            <Text>隐私授权说明</Text><Text className="settings-item__arrow">›</Text>
          </Button>
        </SurfaceCard>
        <ActionButton variant="danger" tone="neutral" block onClick={handleLogout}>退出登录</ActionButton>
        <Text className="version-text">Version 2.4.0</Text>
      </View>
      <BottomMenu activeKey="我的" />
    </PageShell>
  );
};

export default MeTabPage;
