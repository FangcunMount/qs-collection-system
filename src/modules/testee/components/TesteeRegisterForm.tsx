import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { routes } from "@/shared/config/routes";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { setSelectedTesteeId } from "@/shared/stores/testees";
import PageShell from "@/shared/ui/PageShell";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import NeedDialog from "@/shared/ui/NeedDialog";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { registerTesteeComplete } from "@/services/registerService";
import {
  buildTesteeRegistrationPayload,
  createInitialTesteeForm,
  validateTesteeForm,
  type TesteeFormDraft,
} from "../lib/testeeForm";
import TesteeRegisterFields from "./TesteeRegisterFields";
import "./RegisterForm.less";

interface TesteeRegisterFormProps { goUrl?: string; submitClose?: boolean }

const getMessage = (error: unknown): string => (
  error instanceof Error ? error.message : "注册失败，请重试"
);

const TesteeRegisterForm = ({ goUrl = "", submitClose = false }: TesteeRegisterFormProps) => {
  const [profileInfo, setProfileInfo] = useState(createInitialTesteeForm);
  const [validationError, setValidationError] = useState("");
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const verifyProfileInfo = () => {
    const message = validateTesteeForm(profileInfo);
    setValidationError(message);
    if (message) Taro.showToast({ title: message, icon: "none" });
    return !message;
  };

  const afterSubmit = () => {
    if (submitClose) setNeedCloseFlag(true);
    else if (goUrl) Taro.redirectTo({ url: goUrl });
    else Taro.redirectTo({ url: routes.tabHome() });
  };

  const submitTestee = async () => {
    try {
      const { testeeId } = await registerTesteeComplete(buildTesteeRegistrationPayload(profileInfo));
      if (!isMountedRef.current) return;
      setSelectedTesteeId(testeeId);
      afterSubmit();
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      Taro.showToast({ title: getMessage(error), icon: "none" });
      throw error;
    }
  };

  const [submitting, handleSubmit] = useSubmit({
    beforeSubmit: verifyProfileInfo,
    submit: submitTestee,
    options: { needGobalLoading: true, gobalLoadingTips: "注册中..." },
  } as never) as [boolean, () => Promise<boolean>];

  return (
    <PageShell
      tone="medical"
      fixedAction={(
        <BottomActionBar>
          <ActionButton tone="medical" block loading={submitting} onClick={() => void handleSubmit()}>立即注册</ActionButton>
        </BottomActionBar>
      )}
      contentClassName="register-container"
    >
      <NeedDialog flag={needCloseFlag} title={undefined} content="注册完成，点击下方按钮关闭小程序" btnText={undefined} />
      <View className="register-header">
        <Text className="register-title">档案注册</Text>
        <Text className="register-subtitle">请填写档案的基本信息</Text>
      </View>
      <SurfaceCard className="register-card">
        <TesteeRegisterFields
          profileInfo={profileInfo}
          error={validationError}
          onChange={(key, value) => {
            setProfileInfo((current) => ({ ...current, [key]: value } as TesteeFormDraft));
            setValidationError("");
          }}
        />
      </SurfaceCard>
    </PageShell>
  );
};

export default TesteeRegisterForm;
