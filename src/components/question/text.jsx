import React from "react";
import { View } from "@tarojs/components";
import { SiInput } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";

const QsText = props => {
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
        <SiInput
          style={{ flexGrow: 1 }}
          defaultValue={item.value}
          placeholder={item.placeholder}
          disabled={disabled}
          onChange={v => onChangeValue(v, index)}
        ></SiInput>
      </View>
    </ShowContainer>
  );
};

export default QsText;
