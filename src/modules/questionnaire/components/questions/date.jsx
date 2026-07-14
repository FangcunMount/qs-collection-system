import React from "react";
import { View } from "@tarojs/components";
import { DatePickerField } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";
import { formatQuestionDate, parseQuestionDate } from "../../lib/questionValueAdapters";

const QsDate = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const formatDate = date => formatQuestionDate(date, item.format || "YYYY-MM-DD");

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <DatePickerField
          value={parseQuestionDate(item.value)}
          formatValue={formatDate}
          disabled={disabled}
          onChange={date => {
            onChangeValue(formatDate(date), index);
          }}
        />
      </View>
    </ShowContainer>
  );
};

export default QsDate;
