import React, { useEffect, useState } from "react";
import { View, Image } from "@tarojs/components";
import { Field, Radio, RadioGroup } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";
import { normalizeRadioValue } from "../../lib/questionValueAdapters";

const ImageRadio = props => {
  const { item, index, disabled } = props;
  const { onChangeExtend, onChangeValue } = props;

  const [selected, setSelected] = useState("");

  useEffect(() => {
    setSelected(normalizeRadioValue(item.options, item.value));
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
      placeholder={item.placeholder}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <RadioGroup
          value={selected}
          disabled={disabled ?? false}
          onChange={handleSelect}
        >
          {item.options.map((option, i) => {
            const isSelected = selected === option.code;
            return (
              <Radio key={option.code} value={option.code} className={`question-choice question-choice--image ${isSelected ? "is-selected" : ""}`}>
                <View>
                  <View>{option.content}</View>
                  <View className="s-mt-sm">
                    <Image
                      lazyLoad
                      className="question-choice__image"
                      mode="aspectFill"
                      src={option.img_url}
                    />
                  </View>
                </View>
                {option.allow_extend_text === "1" && isSelected ? (
                  <View onClick={e => e.stopPropagation()}>
                  <Field
                    className="question-choice__extend"
                    defaultValue={option.extend_content}
                    placeholder={option.extend_placeholder}
                    onValueChange={v => changeExtend(i, v)}
                    disabled={disabled ?? false}
                  />
                  </View>
                ) : null}
              </Radio>
            );
          })}
        </RadioGroup>
      </View>
    </ShowContainer>
  );
};

export default ImageRadio;
