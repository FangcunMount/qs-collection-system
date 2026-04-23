import React from "react";
import { View } from "@tarojs/components";
import { SiInputNumber } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired, getValidationRule } from "../../lib/questionValidation";

const QsNumber = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const validationRules = item.validation_rules || [];
  const minValue = getValidationRule(validationRules, 'min_value');
  const maxValue = getValidationRule(validationRules, 'max_value');

  const handleChange = v => {
    onChangeValue(v, index);
  }
  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <SiInputNumber
          defaultValue={item.value}
          minValue={minValue ? Number(minValue) : undefined}
          maxValue={maxValue ? Number(maxValue) : undefined}
          disabled={disabled}
          onChange={handleChange}
        ></SiInputNumber>
      </View>
    </ShowContainer>
  );
};

export default QsNumber;
