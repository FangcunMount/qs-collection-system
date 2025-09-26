import React from "react";
import { View } from "@tarojs/components";

const RegisterFooter = ({ submit }) => {
  return (
    <View
      style={{
        height: "100rpx",
        background: "#478de2",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        fontSize: "40rpx"
      }}
      onClick={submit}
    >
      提交
    </View>
  );
};

export default RegisterFooter;
