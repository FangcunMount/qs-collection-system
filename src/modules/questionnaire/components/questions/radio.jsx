import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { SiInput, SiRadio } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const Radio = props => {
  const { item, index, disabled } = props;
  const { onChangeExtend, onChangeValue } = props;

  const [selected, setSelected] = useState('');

  useEffect(() => {
    const matched = item.options.find((option) => option.code === item.value);
    setSelected(matched ? matched.code : "");
  }, [item.code, item.value, item.options]);

  const handleSelect = e => {
    onChangeValue(e, index);
  };

  const changeExtend = (i, v) => {
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
        <SiRadio
          defaultSelected={selected}
          options={item.options}
          labelKey="content"
          valueKey="code"
          disabled={disabled ?? false}
          onChange={handleSelect}
        >
          {(option, i, isSelected) => {
            return (
              <View className={`qs-choice-content ${isSelected ? "is-selected" : ""}`}>
                {option.allow_extend_text === "1" && isSelected ? (
                  <View>
                    <View>{option.content}</View>
                    <SiInput
                      style={{ flexGrow: 1 }}
                      defaultValue={option.extend_content}
                      placeholder={option.extend_placeholder}
                      onChange={v => changeExtend(i, v)}
                      disabled={disabled ?? false}
                    ></SiInput>
                  </View>
                ) : option.content}
              </View>
            );
          }}
        </SiRadio>
      </View>
    </ShowContainer>
  );
};

export default Radio;
