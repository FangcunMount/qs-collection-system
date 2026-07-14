import React from "react";
import { View } from "@tarojs/components";
import { Field } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { getQuestionPlaceholder, isQuestionRequired } from "../../lib/questionValidation";

const QsText = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <Field
          defaultValue={item.value}
          placeholder={getQuestionPlaceholder(item)}
          disabled={disabled}
          onValueChange={v => onChangeValue(v, index)}
        />
      </View>
    </ShowContainer>
  );
};

export default QsText;
