import React from "react";
import { View, Input } from "@tarojs/components";
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

const RegisterUser = ({ userInfo, onChange, onFetchProfile }) => {
  return (
    <View>
      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>用户昵称</View>
        <View onClick={onFetchProfile}>
          <Input
            type="text"
            placeholder="点击获取微信昵称"
            value={userInfo.nickname}
            onInput={e => onChange("nickname", e.detail.value)}
            style={InputCSS}
            disabled
          />
        </View>
      </View>


      <PrivacyAuthorization />
    </View>
  );
};

export default RegisterUser;
