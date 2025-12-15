import React, { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { AtRate } from "taro-ui";
import { SiSeparator } from "taro-ui-fc";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../pages/questionnaire/shared/utils";

const Radio = props => {
  const { index, item, disabled } = props;
  const { onChangeValue } = props;

  const [contentStart, setContentStart] = useState(0);
  const [maxCnt, setMaxCnt] = useState(0);
  const [curStar, setCurStar] = useState(null);

  useEffect(() => {
    const contents = item.options.map(v => v.content);

    const minScore = Math.min(...contents);
    const maxScore = Math.max(...contents);
    setMaxCnt(maxScore - minScore + 1);
    setContentStart(minScore);

    // answer sheet show, init star number
    const selectOptionIndex = item.options.findIndex(v => v.code == item.value);
    if (selectOptionIndex > -1) {
      setCurStar(item.options[selectOptionIndex].content - minScore + 1);
    }
  }, [item, item.options]);

  const handleSelect = e => {
    if (disabled) return;

    setCurStar(e);
    const curCnt = e + contentStart - 1;
    const code = item.options.filter(v => curCnt == v.content)[0].code;
    onChangeValue(code, index);
  };

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={isQuestionRequired(item)}
    >
      <View>
        <View className='s-row' style={{ justifyContent: "space-between" }}>
          <Text className='s-text-tips s-text-body3'>{item.left_desc}</Text>
          <Text className='s-text-tips s-text-body3'>{item.right_desc}</Text>
        </View>

        <SiSeparator className='s-mt-xs s-mb-xs'></SiSeparator>

        <View className='s-row-center'>
          <AtRate
            max={maxCnt}
            value={curStar}
            disabled={disabled ?? false}
            onChange={handleSelect}
          />
        </View>
      </View>
    </ShowContainer>
  );
};

export default Radio;
