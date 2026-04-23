import React, { useState, useEffect } from "react";
import { View } from "@tarojs/components";
import { SiSelect } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const Select = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setSelectedIndex(item.options.findIndex(o => o.code === item.value) ?? -1);
  }, []);

  const handleSelect = option => {
    onChangeValue(option.code, index);
  };

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <SiSelect
          options={item.options}
          defaultSelected={selectedIndex}
          labelKey="content"
          disabled={disabled}
          onChange={handleSelect}
        ></SiSelect>
      </View>
    </ShowContainer>
  );
};

export default Select;
