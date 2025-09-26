import React from "react";
import { View } from "@tarojs/components";
import { SiInputNumber } from "taro-ui-fc";
import "taro-ui-fc/dist/styles/inputNumber.less";
import "taro-ui-fc/dist/styles/icon.scss";

import ShowContainer from "./widget/showContainer";

const FcNumber = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const handleChange = v => {
    onChangeValue(v, index);
  }
  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={item?.validate_rules?.required == "1"}
    >
      <View>
        <SiInputNumber
          defaultValue={item.value}
          minValue={item?.validate_rules?.min_value}
          maxValue={item?.validate_rules?.max_value}
          disabled={disabled}
          onChange={handleChange}
        ></SiInputNumber>
      </View>
    </ShowContainer>
  );
};

export default FcNumber;
