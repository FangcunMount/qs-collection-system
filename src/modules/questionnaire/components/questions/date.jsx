import React from "react";
import { View } from "@tarojs/components";
import { SiDatePicker } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const QsDate = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <SiDatePicker
          value={item.value}
          format={item.format}
          disabled={disabled}
          onChange={v => {
            onChangeValue(v, index);
          }}
        ></SiDatePicker>
      </View>
    </ShowContainer>
  );
};

export default QsDate;
