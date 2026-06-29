import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { SiInput, SiCheckBox } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const Checkbox = props => {
  const { item, index, disabled } = props;
  const { onChangeValue, onChangeExtend } = props;

  const [selectedValues, setSelectedValues] = useState([]);

  useEffect(() => {
    if (Array.isArray(item.value) && item.value.length > 0) {
      setSelectedValues(item.value);
      return;
    }
    const selected = item.options.filter((option) => option.is_select === "1");
    setSelectedValues(selected.length > 0 ? selected.map((option) => option.code) : []);
  }, [item.code, item.value, item.options]);

  const handleSelect = e => {
    onChangeValue(e, index);
  };

  const handleChangeExtend = (i, v) => {
    onChangeExtend(index, i, v);
  };

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <SiCheckBox
          defaultSelectedValues={selectedValues}
          options={item.options}
          labelKey="content"
          valueKey="code"
          disabledKey=""
          disabled={disabled}
          onChange={handleSelect}
        >
          {(option, i, isSelected) => {
            return (
              <View className={`qs-choice-content ${isSelected ? "is-selected" : ""}`}>
                {option.allow_extend_text === "1" && isSelected ? (
                  <View>
                    <View>{option.content}</View>
                    <View onClick={e => e.stopPropagation()}>
                      <SiInput
                        style={{ flexGrow: 1 }}
                        defaultValue={option.extend_content}
                        placeholder={option.extend_placeholder}
                        onChange={v => handleChangeExtend(i, v)}
                        disabled={disabled ?? false}
                      ></SiInput>
                    </View>
                  </View>
                ) : option.content}
              </View>
            );
          }}
        </SiCheckBox>
      </View>
    </ShowContainer>
  );
};

export default Checkbox;
