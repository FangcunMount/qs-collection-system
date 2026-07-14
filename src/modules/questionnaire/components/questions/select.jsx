import React from "react";
import { View } from "@tarojs/components";
import { PickerField } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const Select = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const options = item.options.map(option => ({ label: option.content, value: option.code }));

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <PickerField
          value={item.value}
          options={options}
          placeholder={item.placeholder || "请选择"}
          disabled={disabled}
          onChange={value => onChangeValue(value, index)}
        />
      </View>
    </ShowContainer>
  );
};

export default Select;
