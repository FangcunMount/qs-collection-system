import React, { useEffect, useRef, useState } from "react";
import { Button, Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import Icon from "@/shared/ui/Icon";
import { routes } from "@/shared/config/routes";
import { getAccountStoreState, initAccountStore, subscribeAccountStore } from "@/shared/stores/account";
import { getSessionStoreState, subscribeSessionStore } from "@/shared/stores/session";
import { bootstrapSession } from "@/services/auth/sessionManager";
import { logoutAccount } from "@/modules/account/services/logoutAccount";
import BottomMenu from "@/shared/ui/BottomMenu";
import PageShell from "@/shared/ui/PageShell";
import ActionButton from "@/shared/ui/ActionButton";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import type { UserStoreState } from "@/store/userStore";
import "./MeTabPage.less";

const sessionExists = () => {
  const { tokenData } = getSessionStoreState();
  return Boolean(tokenData?.access_token || tokenData?.refresh_token);
};
const versionLabel = () => {
  try { return Taro.getAccountInfoSync().miniProgram.version || ""; } catch (_) { return ""; }
};

const MeTabPage = () => {
  const [userState, setUserState] = useState<UserStoreState>(() => getAccountStoreState());
  const [isLoggedIn, setIsLoggedIn] = useState(sessionExists);
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const mounted = useRef(true);
  const [version] = useState(versionLabel);
  const userInfo = userState.userInfo;
  const userName = userInfo?.name || userInfo?.nickname || "已登录用户";
  const userAvatar = userInfo?.picture || userInfo?.avatarUrl || "";

  useEffect(() => {
    mounted.current = true;
    const unsubscribeAccount = subscribeAccountStore(setUserState);
    const unsubscribeSession = subscribeSessionStore(() => setIsLoggedIn(sessionExists()));
    return () => { mounted.current = false; unsubscribeAccount(); unsubscribeSession(); };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const initial = getAccountStoreState();
    if (!initial.isInitialized && !initial.isLoading) void initAccountStore();
  }, [isLoggedIn]);

  const handleLogin = async () => {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    try {
      const session = await bootstrapSession({ allowInteractiveLogin: true });
      if (session.status !== "authenticated" && session.status !== "unregistered") {
        Taro.showToast({ title: "暂时无法登录，请稍后重试", icon: "none" });
      }
    } catch (_) {
      Taro.showToast({ title: "登录未完成，请重试", icon: "none" });
    } finally {
      actionPending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const handleLogout = async () => {
    if (actionPending.current) return;
    actionPending.current = true;
    try {
      const confirmation = await Taro.showModal({
        title: "退出登录",
        content: "退出后将清除本机的账号、成员与测评临时信息，已提交的测评记录仍保留在账号中。",
      });
      if (!confirmation.confirm) return;
      setBusy(true);
      const revocation = logoutAccount();
      // Drop old report pages from the navigation stack as soon as local
      // identity is cleared; remote revocation can finish independently.
      await Taro.reLaunch({ url: routes.tabMe() });
      const result = await revocation;
      if (!sessionExists()) Taro.showToast({ title: result.remoteRevoked ? "已退出登录" : "已退出本机，远端注销未确认", icon: "none" });
    } catch (_) {
      Taro.showToast({ title: "退出未完成，请重试", icon: "none" });
    } finally {
      actionPending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const openPrivacy = async () => {
    try {
      if (process.env.TARO_ENV === "weapp" && typeof Taro.openPrivacyContract === "function") {
        await Taro.openPrivacyContract();
        return;
      }
      await Taro.showModal({ title: "隐私授权说明", content: "小程序在登录、家庭档案管理和测评服务中使用必要的身份与档案信息。可在微信的小程序设置中查看和管理授权。", showCancel: false });
    } catch (_) {
      Taro.showToast({ title: "暂时无法打开，可在小程序设置中查看", icon: "none" });
    }
  };

  return (
    <PageShell tone="medical" contentClassName="user-profile-page" bottomInset={false}>
      <View className="profile-header">
        {isLoggedIn ? (
          <View className="user-info">
            <View className="user-avatar">
              {userAvatar ? <Image src={userAvatar} className="avatar-img" mode="aspectFill" /> : <Icon name="user" size={32} />}
            </View>
            <View className="user-details">
              <Text className="user-name">{userName}</Text>
              <Text className="user-desc">{userState.isLoading ? "正在加载账号信息…" : "管理家庭档案，回顾测评记录"}</Text>
            </View>
          </View>
        ) : (
          <SurfaceCard className="login-card">
            <Text className="login-title">欢迎来到 Qlume</Text>
            <Text className="login-subtitle">登录后管理家庭档案，查看已有测评记录。</Text>
            <ActionButton block loading={busy} onClick={() => void handleLogin()}>登录 / 注册</ActionButton>
          </SurfaceCard>
        )}
      </View>
      <View className="profile-group">
        <Text className="profile-group__title">家庭与测评</Text>
        <SurfaceCard className="settings-card">
          <Button className="settings-item" hoverClass="settings-item--pressed" onClick={() => Taro.navigateTo({ url: routes.testeeList() })}>
            <View className="settings-item__content"><Text>家庭档案</Text><Text className="settings-item__description">选择与管理测评成员</Text></View><Text className="settings-item__arrow">›</Text>
          </Button>
          <Button className="settings-item" hoverClass="settings-item--pressed" onClick={() => Taro.navigateTo({ url: routes.assessmentRecords() })}>
            <View className="settings-item__content"><Text>医学测评记录</Text><Text className="settings-item__description">人格与行为报告可从对应目录查看</Text></View><Text className="settings-item__arrow">›</Text>
          </Button>
        </SurfaceCard>
      </View>
      <View className="profile-group">
        <Text className="profile-group__title">通知与隐私</Text>
        <SurfaceCard className="settings-card">
          <Button className="settings-item" hoverClass="settings-item--pressed" onClick={() => Taro.navigateTo({ url: routes.accountSubscription() })}>
            <Text>订阅消息管理</Text><Text className="settings-item__arrow">›</Text>
          </Button>
          <Button className="settings-item" hoverClass="settings-item--pressed" onClick={() => void openPrivacy()}>
            <Text>隐私授权说明</Text><Text className="settings-item__arrow">›</Text>
          </Button>
        </SurfaceCard>
      </View>
      <View className="action-section">
        {isLoggedIn ? <ActionButton variant="ghost" tone="neutral" block loading={busy} onClick={() => void handleLogout()}>退出登录</ActionButton> : null}
        <Text className="version-text">Qlume{version ? ` · ${version}` : ""}</Text>
      </View>
      <BottomMenu activeKey="我的" />
    </PageShell>
  );
};

export default MeTabPage;
