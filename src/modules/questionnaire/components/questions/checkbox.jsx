import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { Checkbox as QlCheckbox, CheckboxGroup, Field } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";
import { normalizeCheckboxValues } from "../../lib/questionValueAdapters";

const Checkbox = props => {
  const { item, index, disabled } = props;
  const { onChangeValue, onChangeExtend } = props;

  const [selectedValues, setSelectedValues] = useState([]);

  useEffect(() => {
    setSelectedValues(normalizeCheckboxValues(item.options, item.value));
  }, [item.code, item.value, item.options]);

  const handleSelect = e => {
    setSelectedValues(e);
    onChangeValue(e, index);
  };

  const handleChangeExtend = (i, v) => {
    onChangeExtend(index, i, v);
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
        <CheckboxGroup
          value={selectedValues}
          disabled={disabled}
          onChange={handleSelect}
        >
          {item.options.map((option, i) => {
            const isSelected = selectedValues.includes(option.code);
            const hasVisibleExtend = option.allow_extend_text === "1" && isSelected;
            return (
              <QlCheckbox key={option.code} value={option.code} className={`question-choice ${isSelected ? "is-selected" : ""} ${hasVisibleExtend ? "question-choice--with-extend" : ""}`}>
                <View className="qs-choice-content">
                {hasVisibleExtend ? (
                  <View>
                    <View>{option.content}</View>
                    <View onClick={e => e.stopPropagation()}>
                      <Field
                        className="question-choice__extend"
                        defaultValue={option.extend_content}
                        placeholder={option.extend_placeholder}
                        onValueChange={v => handleChangeExtend(i, v)}
                        disabled={disabled ?? false}
                      />
                    </View>
                  </View>
                ) : option.content}
                </View>
              </QlCheckbox>
            );
          })}
        </CheckboxGroup>
      </View>
    </ShowContainer>
  );
};

export default Checkbox;
