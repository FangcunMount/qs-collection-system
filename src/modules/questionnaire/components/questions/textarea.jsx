import React from "react";
import { View } from "@tarojs/components";
import { TextareaField } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { getQuestionPlaceholder, getValidationRule, isQuestionRequired } from "../../lib/questionValidation";

const QsTextarea = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const configuredMaxLength = getValidationRule(item.validation_rules, "max_length");
  // Configured bounds are validated by questionnaireFlow using Unicode characters.
  // A native input cap may count UTF-16 units and truncate an otherwise valid answer.
  const handleChange = value => onChangeValue(value, index);
  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <TextareaField
          value={item.value}
          maxlength={configuredMaxLength == null ? 3000 : -1}
          placeholder={getQuestionPlaceholder(item)}
          onValueChange={handleChange}
          disabled={disabled}
        />
      </View>
    </ShowContainer>
  );
};

export default QsTextarea;
