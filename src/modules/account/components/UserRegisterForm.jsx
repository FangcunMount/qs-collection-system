import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";

import "./RegisterForm.less";
import UserRegisterFields from "./UserRegisterFields";
import FormActionFooter from "@/shared/ui/FormActionFooter";
import NeedDialog from "@/shared/ui/NeedDialog";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { getWxApi } from "@/shared/platform/weapp/wxApi";
import { bootstrapSession } from "@/services/auth/sessionManager";
import { routes } from "@/shared/config/routes";
import { registerUser } from "./registerUser";

const createInitialUserInfo = () => ({
  nickname: "",
  avatar: ""
});

const UserRegisterForm = ({ goUrl, submitClose }) => {
  const [userInfo, setUserInfo] = useState(createInitialUserInfo);
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const verifyUserInfo = () => {
    if (!userInfo.nickname) {
      Taro.showToast({ title: "请输入昵称", icon: "none" });
      return false;
    }

    return true;
  };

  const afterSubmit = () => {
    if (submitClose) {
      setNeedCloseFlag(true);
      return;
    }

    if (goUrl) {
      Taro.redirectTo({ url: goUrl });
      return;
    }

    Taro.navigateBack({ delta: 1 });
  };

  const handleUseWechatProfile = async () => {
    try {
      const wxApi = getWxApi();
      if (!wxApi?.getUserProfile) {
        Taro.showToast({
          title: "当前微信版本不支持获取微信资料",
          icon: "none"
        });
        return;
      }

      const profileRes = await new Promise((resolve, reject) => {
        wxApi.getUserProfile({
          desc: "用于完善注册信息中的昵称和头像",
          success: resolve,
          fail: reject
        });
      });

      const profile = profileRes?.userInfo || {};
      setUserInfo((prev) => ({
        ...prev,
        nickname: profile.nickName || prev.nickname
      }));

      Taro.showToast({
        title: "已填充微信资料",
        icon: "success"
      });
    } catch (error) {
      if (error?.errMsg?.includes("auth deny") || error?.errMsg?.includes("cancel")) {
        Taro.showToast({
          title: "已取消获取微信资料",
          icon: "none"
        });
        return;
      }

      Taro.showToast({
        title: "获取微信资料失败",
        icon: "none"
      });
    }
  };

  const registerUserHandler = async () => {
    try {
      const userPayload = {
        name: userInfo.nickname || "",
        nickname: userInfo.nickname || "",
        avatar: userInfo.avatar || ""
      };
      const userRes = await registerUser(userPayload);

      if (!isMountedRef.current) {
        return;
      }

      Taro.setStorageSync("userInfo", userRes);

      try {
        const session = await bootstrapSession({
          allowInteractiveLogin: true
        });
        if (session.status === "authenticated") {
          Taro.reLaunch({ url: routes.tabHome() });
          return;
        }
      } catch (loginErr) {
        console.warn("[UserRegisterForm] 自动登录失败，回退到原有跳转逻辑", loginErr);
      }

      afterSubmit();
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = (error?.errMsg?.includes("auth deny") || error?.errMsg?.includes("cancel"))
        ? "需要授权获取头像昵称"
        : (error?.message || "注册失败，请重试");

      Taro.showToast({
        title: errorMessage,
        icon: "none"
      });
      throw error;
    }
  };

  const [, handleSubmit] = useSubmit({
    beforeSubmit: verifyUserInfo,
    submit: registerUserHandler,
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "注册中..."
    }
  });

  const handleChangeUserInfo = (key, value) => {
    setUserInfo((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <View className="register-container">
      <NeedDialog
        flag={needCloseFlag}
        content="注册完成，点击下方按钮关闭小程序"
      />

      <View className="register-header">
        <View className="register-title">用户注册</View>
        <View className="register-subtitle">请填写您的基本信息</View>
      </View>

      <View className="register-card">
        <UserRegisterFields
          userInfo={userInfo}
          onChange={handleChangeUserInfo}
          onUseWechatProfile={handleUseWechatProfile}
        />
      </View>

      <FormActionFooter submit={handleSubmit} buttonText="立即注册" />
    </View>
  );
};

UserRegisterForm.propTypes = {
  goUrl: PropTypes.string,
  submitClose: PropTypes.bool
};

UserRegisterForm.defaultProps = {
  goUrl: "",
  submitClose: false
};

export default UserRegisterForm;
