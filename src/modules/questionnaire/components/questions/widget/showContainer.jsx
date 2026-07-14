import { View, Text } from "@tarojs/components";
import React from "react";

import { resolveQuestionTitle, resolveQuestionTips } from "../../../lib/questionValidation";
import "./showContainer.less";

const ShowContainer = props => {
  const title = resolveQuestionTitle(props);
  const tips = resolveQuestionTips(props);

  return (
    <View className={`question-content${tips ? ' question-content--with-tips' : ''}`}>
      <View className='question-title'>
        {props.index !== undefined && (
          <Text className='question-number'>{props.index + 1}. </Text>
        )}
        {title}
        <Text style={{ color: "red" }}>
          {props.required ? "（*必填）" : ""}
        </Text>
      </View>
      {tips ? (
        <View className='s-text-body2 s-text-tips s-mx-sm'>{tips}</View>
      ) : null}
      <View>{props.children}</View>
    </View>
  );
};

export default ShowContainer;
