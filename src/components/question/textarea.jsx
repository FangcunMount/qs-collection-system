import React from "react";
import { View } from "@tarojs/components";
import { AtTextarea } from "taro-ui";
import "taro-ui/dist/style/components/textarea.scss";

import ShowContainer from "./widget/showContainer";

const QsTextarea = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const handleChange = v => {
    if (
      item.validate_rules.max_words &&
      v.length > item.validate_rules.max_words
    ) {
      v = v.slice(0, item.validate_rules.max_words);
    }
    onChangeValue(v, index);
  };
  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={item?.validate_rules?.required == "1"}
    >
      <View>
        <AtTextarea
          style={{ flexGrow: 1 }}
          value={item.value}
          count={!disabled}
          maxLength={item.validate_rules?.max_words ?? 3000}
          placeholder={item.placeholder}
          onChange={handleChange}
          disabled={disabled}
        ></AtTextarea>
      </View>
    </ShowContainer>
  );
};

export default QsTextarea;
