import React, { useEffect, useState } from "react";
import { Button, Text, View } from "@tarojs/components";

import "./privacyAuthorization.less";

interface PrivacyDecision {
  event: "agree" | "disagree";
  buttonId?: string;
}

type PrivacyResolver = (decision: PrivacyDecision) => void;

interface PrivacySettingResult {
  needAuthorization?: boolean;
  [key: string]: unknown;
}

interface WeappPrivacyApi {
  onNeedPrivacyAuthorization?: (callback: (resolve: PrivacyResolver) => void) => void;
  openPrivacyContract?: () => void;
  getPrivacySetting?: (options: {
    success: (result: PrivacySettingResult) => void;
    fail: (error: unknown) => void;
  }) => void;
  requirePrivacyAuthorize?: (options: {
    success: (result: unknown) => void;
    fail: (error: unknown) => void;
  }) => void;
}

declare const wx: WeappPrivacyApi | undefined;

const weapp = typeof wx !== "undefined" ? wx : undefined;

let privacyHandler: ((resolve: PrivacyResolver) => void) | undefined;
const privacyResolves = new Set<PrivacyResolver>();
const closeOtherPagePopUpHooks = new Set<() => void>();

weapp?.onNeedPrivacyAuthorization?.((resolve) => {
  privacyHandler?.(resolve);
});

const closeOtherPagePopUp = (closePopUp: () => void) => {
  closeOtherPagePopUpHooks.forEach((hook) => {
    if (closePopUp !== hook) {
      hook();
    }
  });
};

const readButtonId = (event: unknown): string => {
  const candidate = event as {
    detail?: { buttonId?: string };
    target?: { id?: string };
    currentTarget?: { id?: string };
  } | null;
  return candidate?.detail?.buttonId
    || candidate?.target?.id
    || candidate?.currentTarget?.id
    || "agree-btn";
};

export const PrivacyAuthorization = () => {
  const [hideDialog, setHideDialog] = useState(true);

  const hide = () => setHideDialog(true);

  const handleOpenPrivacyContract = () => {
    weapp?.openPrivacyContract?.();
  };

  const handleAgree = (event: unknown) => {
    const buttonId = readButtonId(event);
    hide();
    privacyResolves.forEach((resolve) => {
      resolve({ event: "agree", buttonId });
    });
    privacyResolves.clear();
  };

  const handleDisagree = () => {
    hide();
    privacyResolves.forEach((resolve) => {
      resolve({ event: "disagree" });
    });
    privacyResolves.clear();
  };

  useEffect(() => {
    const closePopUp = () => setHideDialog(true);
    privacyHandler = (resolve) => {
      privacyResolves.add(resolve);
      setHideDialog(false);
      closeOtherPagePopUp(closePopUp);
    };
    closeOtherPagePopUpHooks.add(closePopUp);

    return () => {
      closeOtherPagePopUpHooks.delete(closePopUp);
    };
  }, []);

  if (hideDialog) {
    return null;
  }

  return (
    <View className="qs-xs-half-screen-dialog" hidden={hideDialog}>
      <View
        className="qs-xs-half-screen-dialog-mask"
        onClick={handleDisagree}
      />
      <View className="qs-xs-half-screen-dialog__hd">
        <Text className="qs-xs-half-screen-dialog__title">用户隐私保护提示</Text>
      </View>
      <View className="qs-xs-half-screen-dialog__bd">
        <View className="qs-xs-half-screen-dialog__tips">感谢您使用本产品，请您先阅读并同意</View>
        <View
          className="qs-xs-half-screen-dialog__tips privacy-contract-link"
          onClick={handleOpenPrivacyContract}
        >
          《用户隐私保护指引》
        </View>
        <View className="qs-xs-half-screen-dialog__tips">
          当您点击同意并开始使用产品服务时，即表示您已理解并同意该条款内容，该条款将对您产生法律约束力。如您拒绝，将无法继续使用。
        </View>
      </View>
      <View className="qs-xs-half-screen-dialog__ft">
        <View className="qs-xs-half-screen-dialog__btn-area">
          <Button
            id="disagree-btn"
            type="default"
            className="qs-xs-btn btn-warning"
            onClick={handleDisagree}
          >
            不同意
          </Button>
          <Button
            id="agree-btn"
            type="primary"
            className="qs-xs-btn btn-primary"
            openType="agreePrivacyAuthorization"
            onAgreePrivacyAuthorization={handleAgree}
          >
            同意
          </Button>
        </View>
      </View>
    </View>
  );
};

export const requestPrivacyAuthorization = (): Promise<unknown> => (
  new Promise((resolve, reject) => {
    if (!weapp?.getPrivacySetting) {
      resolve(undefined);
      return;
    }

    weapp.getPrivacySetting({
      success: (result) => {
        if (!result.needAuthorization) {
          resolve(result);
          return;
        }

        if (!weapp.requirePrivacyAuthorize) {
          reject(new Error("当前微信版本不支持隐私授权"));
          return;
        }

        weapp.requirePrivacyAuthorize({
          success: resolve,
          fail: reject,
        });
      },
      fail: reject,
    });
  })
);

