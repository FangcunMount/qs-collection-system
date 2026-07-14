import React, { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { Rate } from "@/shared/ui";

import ShowContainer from "./widget/showContainer";
import { isQuestionRequired } from "../../lib/questionValidation";
import { getRatingForScoreCode, getScoreCodeForRating, getScoreRange } from "../../lib/questionValueAdapters";

const Radio = props => {
  const { index, item, disabled } = props;
  const { onChangeValue } = props;

  const [maxCnt, setMaxCnt] = useState(0);
  const [curStar, setCurStar] = useState(null);

  useEffect(() => {
    const { count } = getScoreRange(item.options);
    setMaxCnt(count);

    // answer sheet show, init star number
    setCurStar(getRatingForScoreCode(item.options, item.value));
  }, [item, item.options]);

  const handleSelect = e => {
    if (disabled) return;

    setCurStar(e);
    const code = getScoreCodeForRating(item.options, e);
    if (code !== undefined) onChangeValue(code, index);
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
        <View className='s-row' style={{ justifyContent: "space-between" }}>
          <Text className='s-text-tips s-text-body3'>{item.left_desc}</Text>
          <Text className='s-text-tips s-text-body3'>{item.right_desc}</Text>
        </View>

        <View className='question-score__separator' />

        <View className='s-row-center'>
          <Rate
            count={maxCnt}
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
