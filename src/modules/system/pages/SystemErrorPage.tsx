import React, { useEffect, useState } from "react";
import { Image, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";

import emptyData from "@/assets/images/empty_data.png";
import { ROUTES } from "@/shared/config/routes";
import ActionButton from "@/shared/ui/ActionButton";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SurfaceCard from "@/shared/ui/SurfaceCard";

import "./SystemErrorPage.less";

const SystemErrorPage = () => {
  const [title, setTitle] = useState("页面暂不可用");
  const [text, setText] = useState("未知错误");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("返回首页");
  const [buttonUrl, setButtonUrl] = useState<string>(ROUTES.tabHome);

  const paramData = useRouter().params;

  useEffect(() => {
    setTitle(paramData.title || "页面暂不可用");
    setText(paramData.text || "未知错误");
    setDescription(paramData.desc || "");
    setButtonText(paramData.buttonText || "返回首页");
    setButtonUrl(paramData.buttonUrl || ROUTES.tabHome);
  }, [paramData.buttonText, paramData.buttonUrl, paramData.desc, paramData.text, paramData.title]);

  const handleAction = () => {
    if (!buttonUrl) {
      Taro.navigateBack({ delta: 1 });
      return;
    }

    Taro.reLaunch({ url: buttonUrl });
  };

  return (
    <PageShell
      tone="neutral"
      scroll={false}
      navigation={(
        <AppNavigationBar title="提示" showBack />
      )}
      contentClassName="system-error-page"
    >
      <SurfaceCard className="system-error-card">
        <Image
          className="system-error-card__image"
          src={emptyData}
          mode="aspectFit"
        />
        <View className="system-error-card__copy">
          <Text className="system-error-card__title">{title}</Text>
          <Text className="system-error-card__text">{text}</Text>
          {description ? (
            <Text className="system-error-card__description">{description}</Text>
          ) : null}
        </View>
        <ActionButton block tone="medical" onClick={handleAction}>
          {buttonText}
        </ActionButton>
      </SurfaceCard>
    </PageShell>
  );
};

export default SystemErrorPage;
