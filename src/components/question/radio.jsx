import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { SiInput, SiRadio } from "taro-ui-fc";
import "taro-ui-fc/dist/styles/radio.less";
import "taro-ui-fc/dist/styles/input.less";

import ShowContainer from "./widget/showContainer";

const Radio = props => {
  const { item, index, disabled } = props;
  const { onChangeExtend, onChangeValue } = props;

  const [selected, setSelected] = useState('');

  useEffect(() => {
    const o = item.options.find(o => o.code === item.value)
    if (o) setSelected(o.code);
  }, []);

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
      required={item?.validate_rules?.required == "1"}
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
            if (option.allow_extend_text === "1" && isSelected) {
              return (
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
              );
            } else {
              return option.content;
            }
          }}
        </SiRadio>
      </View>
    </ShowContainer>
  );
};

export default Radio;
