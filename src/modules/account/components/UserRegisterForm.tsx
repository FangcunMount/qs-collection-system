import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { routes } from "@/shared/config/routes";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { getWxApi } from "@/shared/platform/weapp/wxApi";
import PageShell from "@/shared/ui/PageShell";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import NeedDialog from "@/shared/ui/NeedDialog";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { bootstrapSession } from "@/services/auth/sessionManager";
import {
  buildUserRegistrationPayload,
  createInitialUserRegistration,
  validateUserRegistration,
} from "../lib/accountRegistration";
import { registerUser } from "./registerUser";
import UserRegisterFields from "./UserRegisterFields";
import "./RegisterForm.less";

interface UserRegisterFormProps {
  goUrl?: string;
  submitClose?: boolean;
}

interface WechatProfileResult { userInfo?: { nickName?: string } }
interface WechatProfileApi {
  getUserProfile?: (options: {
    desc: string;
    success: (result: WechatProfileResult) => void;
    fail: (error: unknown) => void;
  }) => void;
}

const errorMessage = (error: unknown): string => {
  const source = error && typeof error === "object" ? error as { errMsg?: string; message?: string } : {};
  return source.errMsg || source.message || "";
};

const UserRegisterForm = ({ goUrl = "", submitClose = false }: UserRegisterFormProps) => {
  const [userInfo, setUserInfo] = useState(createInitialUserRegistration);
  const [validationError, setValidationError] = useState("");
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const verifyUserInfo = () => {
    const message = validateUserRegistration(userInfo);
    setValidationError(message);
    if (message) Taro.showToast({ title: message, icon: "none" });
    return !message;
  };

  const afterSubmit = () => {
    if (submitClose) {
      setNeedCloseFlag(true);
    } else if (goUrl) {
      Taro.redirectTo({ url: goUrl });
    } else {
      Taro.navigateBack({ delta: 1 });
    }
  };

  const handleUseWechatProfile = async () => {
    try {
      const wxApi = getWxApi() as WechatProfileApi;
      if (!wxApi.getUserProfile) {
        Taro.showToast({ title: "当前微信版本不支持获取微信资料", icon: "none" });
        return;
      }
      const profile = await new Promise<WechatProfileResult>((resolve, reject) => {
        wxApi.getUserProfile?.({ desc: "用于完善注册信息中的昵称和头像", success: resolve, fail: reject });
      });
      setUserInfo((current) => ({ ...current, nickname: profile.userInfo?.nickName || current.nickname }));
      setValidationError("");
      Taro.showToast({ title: "已填充微信资料", icon: "success" });
    } catch (error: unknown) {
      const message = errorMessage(error);
      Taro.showToast({
        title: message.includes("auth deny") || message.includes("cancel") ? "已取消获取微信资料" : "获取微信资料失败",
        icon: "none",
      });
    }
  };

  const submitRegistration = async () => {
    try {
      const user = await registerUser(buildUserRegistrationPayload(userInfo));
      if (!isMountedRef.current) return;
      Taro.setStorageSync("userInfo", user);
      try {
        const session = await bootstrapSession({ allowInteractiveLogin: true });
        if (session.status === "authenticated") {
          Taro.reLaunch({ url: routes.tabHome() });
          return;
        }
      } catch (loginError: unknown) {
        console.warn("[UserRegisterForm] 自动登录失败，回退到原有跳转逻辑", loginError);
      }
      afterSubmit();
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      const message = errorMessage(error);
      Taro.showToast({
        title: message.includes("auth deny") || message.includes("cancel")
          ? "需要授权获取头像昵称"
          : message || "注册失败，请重试",
        icon: "none",
      });
      throw error;
    }
  };

  const [submitting, handleSubmit] = useSubmit({
    beforeSubmit: verifyUserInfo,
    submit: submitRegistration,
    options: { needGobalLoading: true, gobalLoadingTips: "注册中..." },
  } as never) as [boolean, () => Promise<boolean>];

  const fixedAction = (
    <BottomActionBar>
      <ActionButton tone="medical" block loading={submitting} onClick={() => void handleSubmit()}>
        立即注册
      </ActionButton>
    </BottomActionBar>
  );

  return (
    <>
      <PageShell tone="medical" fixedAction={fixedAction} contentClassName="register-container">
        <NeedDialog flag={needCloseFlag} title={undefined} content="注册完成，点击下方按钮关闭小程序" btnText={undefined} />
        <View className="register-header">
          <Text className="register-title">用户注册</Text>
          <Text className="register-subtitle">请填写您的基本信息</Text>
        </View>
        <SurfaceCard className="register-card">
          <UserRegisterFields
            userInfo={userInfo}
            error={validationError}
            onChange={(key, value) => {
              setUserInfo((current) => ({ ...current, [key]: value }));
              if (key === "nickname") setValidationError("");
            }}
            onUseWechatProfile={() => void handleUseWechatProfile()}
          />
        </SurfaceCard>
      </PageShell>
      <PrivacyAuthorization />
    </>
  );
};

export default UserRegisterForm;
