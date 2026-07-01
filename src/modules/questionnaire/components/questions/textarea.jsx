import React from "react";
import { View } from "@tarojs/components";
import { AtTextarea } from "taro-ui";

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
        <AtTextarea
          style={{ flexGrow: 1 }}
          value={item.value}
          count={!disabled}
          maxLength={item.validate_rules?.max_words ?? 3000}
          placeholder={getQuestionPlaceholder(item)}
          onChange={handleChange}
          disabled={disabled}
        ></AtTextarea>
      </View>
    </ShowContainer>
  );
};

export default QsTextarea;
