import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";

import "./RegisterForm.less";
import TesteeRegisterFields from "./TesteeRegisterFields";
import FormActionFooter from "@/shared/ui/FormActionFooter";
import NeedDialog from "@/shared/ui/NeedDialog";
import { routes } from "@/shared/config/routes";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { registerChildComplete } from "@/services/registerService.ts";
import { setSelectedTesteeId } from "@/shared/stores/testees";

const createInitialChildInfo = () => ({
  legalName: "",
  gender: null,
  dob: "",
  relation: "parent"
});

const TesteeRegisterForm = ({ goUrl, submitClose }) => {
  const [childInfo, setChildInfo] = useState(createInitialChildInfo);
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const verifyChildInfo = () => {
    if (!childInfo.legalName) {
      Taro.showToast({ title: "请填写档案的姓名", icon: "none" });
      return false;
    }

    if (childInfo.gender === null) {
      Taro.showToast({ title: "请选择档案的性别", icon: "none" });
      return false;
    }

    if (!childInfo.dob) {
      Taro.showToast({ title: "请选择档案的出生日期", icon: "none" });
      return false;
    }

    if (!childInfo.relation) {
      Taro.showToast({ title: "请选择关系", icon: "none" });
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

    Taro.redirectTo({ url: routes.tabHome() });
  };

  const registerChild = async () => {
    try {
      const childPayload = {
        name: childInfo.legalName,
        birthday: childInfo.dob,
        sex: childInfo.gender
      };

      const { testeeId } = await registerChildComplete(childPayload);

      if (!isMountedRef.current) {
        return;
      }

      setSelectedTesteeId(testeeId);
      afterSubmit();
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      Taro.showToast({
        title: error.message || "注册失败，请重试",
        icon: "none"
      });
      throw error;
    }
  };

  const [, handleSubmit] = useSubmit({
    beforeSubmit: verifyChildInfo,
    submit: registerChild,
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "注册中..."
    }
  });

  const handleChangeChildInfo = (key, value) => {
    setChildInfo((prev) => ({
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
        <View className="register-title">档案注册</View>
        <View className="register-subtitle">请填写档案的基本信息</View>
      </View>

      <View className="register-card">
        <TesteeRegisterFields childInfo={childInfo} onChange={handleChangeChildInfo} />
      </View>

      <FormActionFooter submit={handleSubmit} buttonText="立即注册" />
    </View>
  );
};

TesteeRegisterForm.propTypes = {
  goUrl: PropTypes.string,
  submitClose: PropTypes.bool
};

TesteeRegisterForm.defaultProps = {
  goUrl: "",
  submitClose: false
};

export default TesteeRegisterForm;
