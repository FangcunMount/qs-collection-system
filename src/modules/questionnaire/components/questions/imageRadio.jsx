import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { SiInput, SiRadio } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";

const ImageRadio = props => {
  const { item, index, disabled } = props;
  const { onChangeExtend, onChangeValue } = props;

  const [selected, setSelected] = useState("");

  useEffect(() => {
    const o = item.options.find(o => o.code === item.value);
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
              <>
                <View key={i}>
                  <View>{option.content}</View>
                  <View className="s-mt-sm">
                    <Image
                      lazyLoad
                      style={{ width: '0', height: "100px" }}
                      mode="heightFix"
                      src={option.img_url}
                    />
                  </View>
                </View>
                {option.allow_extend_text === "1" && isSelected ? (
                  <SiInput
                    style={{ flexGrow: 1 }}
                    defaultValue={option.extend_content}
                    placeholder={option.extend_placeholder}
                    onChange={v => changeExtend(i, v)}
                    disabled={disabled ?? false}
                  ></SiInput>
                ) : null}
              </>
            );
          }}
        </SiRadio>
      </View>
    </ShowContainer>
  );
};

export default ImageRadio;
