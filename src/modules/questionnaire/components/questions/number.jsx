import React from "react";
import { View } from "@tarojs/components";
import { Stepper } from "@/shared/ui";

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
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <Stepper
          value={item.value}
          min={minValue ? Number(minValue) : undefined}
          max={maxValue ? Number(maxValue) : undefined}
          disabled={disabled}
          onChange={handleChange}
        />
      </View>
    </ShowContainer>
  );
};

export default QsNumber;
