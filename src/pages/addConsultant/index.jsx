import React from "react";
import { View, Image } from "@tarojs/components";

import addConsultantQRCodePng from "../../assets/images/addConsultantQRCode.png";
import logoPng from "../../assets/images/logo.png";
import qsLogoPng from "../../assets/images/qs-logo.png";

export default () => {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <View
        style={{
          width: "100%",
          padding: "32rpx 0 0 50rpx",
          boxSizing: "border-box"
        }}
      >
        <Image
          src={logoPng}
          mode='widthFix'
          style={{ width: "250rpx" }}
        ></Image>
      </View>

      <View
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "40%"
        }}
      >
        <Image
          style={{ width: "375rpx" }}
          mode='widthFix'
          src={addConsultantQRCodePng}
          showMenuByLongpress
        ></Image>
        <View className='s-text-secondary s-text-body1 s-mt-sm'>
          长按识别添加顾问获取评估报告
        </View>
      </View>

      <View className='s-row-center' style={{ marginBottom: "48rpx" }}>
        <Image
          src={qsLogoPng}
          style={{ height: "36rpx", marginTop: "6rpx" }}
          mode='heightFix'
        ></Image>
        <View
          className='s-text-secondary s-text-body2'
          style={{ height: "48rpx", lineHeight: "48rpx", marginLeft: "12rpx" }}
        >
          问卷
        </View>
        <View
          className='s-text-tips s-text-body3'
          style={{ height: "48rpx", lineHeight: "48rpx", marginLeft: "24rpx" }}
        >
          提供技术支持
        </View>
      </View>
    </View>
  );
};
