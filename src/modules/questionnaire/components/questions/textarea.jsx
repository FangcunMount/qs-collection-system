import React from "react";
import { View } from "@tarojs/components";
import { TextareaField } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { getQuestionPlaceholder, isQuestionRequired } from "../../lib/questionValidation";

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
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <TextareaField
          value={item.value}
          maxLength={item.validate_rules?.max_words ?? 3000}
          placeholder={getQuestionPlaceholder(item)}
          onValueChange={handleChange}
          disabled={disabled}
        />
      </View>
    </ShowContainer>
  );
};

export default QsTextarea;
