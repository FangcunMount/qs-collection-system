import React from "react";
import { View } from "@tarojs/components";
import { SiDatePicker } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";

const FcDate = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={item?.validate_rules?.required == "1"}
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

export default FcDate;
