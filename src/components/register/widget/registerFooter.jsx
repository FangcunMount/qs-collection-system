import React from "react";
import { View } from "@tarojs/components";

const RegisterFooter = ({ submit, buttonText = "立即注册" }) => {
  return (
    <View
      style={{
        padding: "32rpx",
        background: "#fff",
        borderTop: "1rpx solid #f0f0f0"
      }}
    >
      <View
        style={{
          height: "96rpx",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "48rpx",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontSize: "32rpx",
          fontWeight: "600",
          boxShadow: "0 8rpx 24rpx rgba(102, 126, 234, 0.35)",
          transition: "all 0.3s ease"
        }}
        onClick={submit}
      >
        {buttonText}
      </View>
    </View>
  );
};

export default RegisterFooter;
