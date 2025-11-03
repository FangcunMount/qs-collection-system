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

const UserName = ({ username, onChange }) => {
  const handleNameInput = (e) => {
    const value = e.detail.value;
    onChange("username", value);
  };

  return (
    <View style={InputWrapperCSS}>
      <View style={InputLabelCSS}>您的姓名</View>
      <Input
        type="text"
        placeholder="请输入您的姓名"
        value={username}
        onInput={handleNameInput}
        style={InputCSS}
      />
    </View>
  );
};

const UserPhone = ({ phone, onChange }) => {
  const handlePhoneInput = (e) => {
    const value = e.detail.value;
    onChange("phone", value);
  };

  return (
    <View style={InputWrapperCSS}>
      <View style={InputLabelCSS}>手机号码</View>
      <Input
        type="number"
        placeholder="请输入11位手机号"
        value={phone}
        onInput={handlePhoneInput}
        maxlength={11}
        style={InputCSS}
      />
    </View>
  );
};

const RegisterCoillterUser = ({ contactInfo, onChange }) => {
  const handleChangeContact = (k, v) => {
    onChange("contact", k, v);
  };
  return (
    <View>
      <UserName username={contactInfo.username} onChange={handleChangeContact} />
      <UserPhone phone={contactInfo.phone} onChange={handleChangeContact} />

      <PrivacyAuthorization />
    </View>
  );
};

export default RegisterCoillterUser;
