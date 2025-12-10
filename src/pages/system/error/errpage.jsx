import { View, Image, Text } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";
import React, { useEffect, useState } from "react";

import emptyData from "../../../assets/images/empty_data.png";
import './index.less'

const Index = () => {
  const [text, setText] = useState("未知错误");

  const paramData = useRouter().params;

  useEffect(() => {
    setText(paramData.text)
  }, [paramData.text]);
  return (
    <View class='empty-data'>
      <Image
        class='empty-data__img'
        src={emptyData}
      ></Image>
      <Text class='empty-data__text'>{ text }</Text>
    </View>
  );
};

export default Index;
