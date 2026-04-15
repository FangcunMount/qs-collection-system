import React from "react";
import { View, Input, Text, Button } from "@tarojs/components";
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

const SecondaryButtonCSS = {
  width: "100%",
  height: "84rpx",
  lineHeight: "84rpx",
  borderRadius: "12rpx",
  background: "#f3f8ff",
  color: "#1677ff",
  fontSize: "28rpx",
  border: "2rpx solid #b7d4ff"
};

const RegisterUser = ({ userInfo, onChange, onUseWechatProfile }) => {
  return (
    <View>
      <View style={InputWrapperCSS}>
        <Button style={SecondaryButtonCSS} onClick={onUseWechatProfile}>
          使用微信昵称
        </Button>
        <Text style={HintCSS}>
          昵称需要你主动确认后才能回填，头像不在注册阶段获取。
        </Text>
      </View>

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
          可直接填写，也可以点击上方按钮使用微信昵称回填。
        </Text>
      </View>


      <PrivacyAuthorization />
    </View>
  );
};

export default RegisterUser;
