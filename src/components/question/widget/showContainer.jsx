import { View, Text } from "@tarojs/components";
import React from "react";

import "./showContainer.less";

const ShowContainer = props => {
  return (
    <View>
      <View className='question-title'>
        {props.title}
        <Text style={{ color: "red" }}>
          {props.required ? "（*必填）" : ""}
        </Text>
      </View>
      <View className='s-text-body2 s-text-tips s-mx-sm'>{props.tips}</View>
      <View>{props.children}</View>
    </View>
  );
};

export default ShowContainer;
