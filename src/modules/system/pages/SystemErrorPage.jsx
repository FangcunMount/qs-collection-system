import { View, Image, Text } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import React, { useEffect, useState } from "react";
import { AtButton } from "taro-ui";
import { ROUTES } from "@/shared/config/routes";

import emptyData from "@/assets/images/empty_data.png";
import "./SystemErrorPage.less";

const Index = () => {
  const [title, setTitle] = useState("页面暂不可用");
  const [text, setText] = useState("未知错误");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("返回首页");
  const [buttonUrl, setButtonUrl] = useState(ROUTES.tabHome);

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
    <View className='empty-data'>
      <Image
        className='empty-data__img'
        src={emptyData}
      />
      <Text className='empty-data__title'>{ title }</Text>
      <Text className='empty-data__text'>{ text }</Text>
      {description ? (
        <Text className='empty-data__desc'>{description}</Text>
      ) : null}
      <AtButton type='primary' className='empty-data__button' onClick={handleAction}>
        {buttonText}
      </AtButton>
    </View>
  );
};

export default Index;
