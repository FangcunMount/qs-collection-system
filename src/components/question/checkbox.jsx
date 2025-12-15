import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { SiInput, SiCheckBox } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../pages/questionnaire/shared/utils";

const Checkbox = props => {
  const { item, index, disabled } = props;
  const { onChangeValue, onChangeExtend } = props;

  const [selectedValues, setSelectedValues] = useState([]);

  useEffect(() => {
    const o = item.options.filter(o => o.is_select === "1");
    if (o.length > 0) setSelectedValues(o.map(v => v.code));
  }, []);

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
            if (option.allow_extend_text === "1" && isSelected) {
              return (
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
              );
            } else {
              return option.content;
            }
          }}
        </SiCheckBox>
      </View>
    </ShowContainer>
  );
};

export default Checkbox;
