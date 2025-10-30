import React, { useEffect, useState } from "react";
import { View, Image } from "@tarojs/components";
import { SiInput, SiCheckBox } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";

const ImageRadio = props => {
  const { item, index, disabled } = props;
  const { onChangeExtend, onChangeValue } = props;

  const [selectedValues, setSelectedValues] = useState([]);

  useEffect(() => {
    const o = item.options.filter(o => o.is_select === "1");
    if (o.length > 0) setSelectedValues(o.map(v => v.code));
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
        <SiCheckBox
          defaultSelectedValues={selectedValues}
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
        </SiCheckBox>
      </View>
    </ShowContainer>
  );
};

export default ImageRadio;
