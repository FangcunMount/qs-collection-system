import React from "react";
import { View } from "@tarojs/components";

const FormActionFooter = ({ submit, buttonText = "立即提交" }) => {
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
          background: "linear-gradient(135deg, #1890FF 0%, #096DD9 100%)",
          borderRadius: "48rpx",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontSize: "32rpx",
          fontWeight: "600",
          boxShadow: "0 8rpx 24rpx rgba(24, 144, 255, 0.35)",
          transition: "all 0.3s ease"
        }}
        onClick={submit}
      >
        {buttonText}
      </View>
    </View>
  );
};

export default FormActionFooter;
