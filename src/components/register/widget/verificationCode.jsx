import React, { useState, useEffect } from "react";
import { Input, View } from "@tarojs/components";

import "./verificationCode.less";

const VerificationCode = ({ value, onChange, vertifyNum }) => {
  const [isVFocus, setIsVFocus] = useState(false);
  const [renderInputArr, setRenderInputArr] = useState(null);

  useEffect(() => {
    setRenderInputArr(() => {
      return new Array(vertifyNum).fill("");
    });
  }, [vertifyNum]);

  const handleInput = e => {
    onChange(e.detail.value);
  };

  const createElements = () => {
    if (!renderInputArr) {
      return null;
    }

    return renderInputArr.map((v, i) => {
      return (
        <View key={i} class="qs-code--box" onClick={() => setIsVFocus(true)}>
          <Input
            className={
              (value.length === i && isVFocus) ||
              (value.length == vertifyNum && isVFocus && i == vertifyNum - 1)
                ? "is-input"
                : ""
            }
            value={value.length >= i + 1 ? value[i] : ""}
            type="number"
            disabled
          ></Input>
        </View>
      );
    });
  };

  return (
    <View className="qs-code">
      <View className="qs-code--box__container">{createElements()}</View>

      <Input
        type="number"
        class="ipt"
        maxlength={vertifyNum}
        value={value}
        focus={isVFocus}
        onBlur={() => setIsVFocus(false)}
        onInput={handleInput}
      ></Input>
    </View>
  );
};

export default VerificationCode;
