import React from "react";
import { View, Input, Text } from "@tarojs/components";
import { PrivacyAuthorization } from "../../privacyAuthorization/privacyAuthorization";

const InputLabelCSS = {
  margin: "0 0 16rpx 0",
  color: "#333",
  fontSize: "28rpx",
  fontWeight: "500"
};

const InputCSS = {
  padding: "28rpx 24rpx",
  background: "#f7f8fa",
  borderRadius: "12rpx",
  fontSize: "28rpx",
  border: "2rpx solid transparent",
  transition: "all 0.3s ease"
};

const InputWrapperCSS = {
  marginBottom: "32rpx"
};

const HintCSS = {
  marginTop: "12rpx",
  color: "#8c8c8c",
  fontSize: "24rpx",
  lineHeight: "36rpx"
};

const RegisterUser = ({ userInfo, onChange }) => {
  return (
    <View>
      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>用户昵称</View>
        <Input
          type="nickname"
          placeholder="请输入昵称"
          value={userInfo.nickname}
          onInput={e => onChange("nickname", e.detail.value)}
          style={InputCSS}
        />
        <Text style={HintCSS}>
          请直接填写昵称，使用微信昵称输入能力。
        </Text>
      </View>


      <PrivacyAuthorization />
    </View>
  );
};

export default RegisterUser;
