import React from "react";
import { View, Button } from "@tarojs/components";
import { PrivacyAuthorization } from "../../privacyAuthorization/privacyAuthorization";

import { getPhoneByWxcode } from "./api";

const UserPhone = ({ phone, onChange }) => {
  const getPhoneNumber = e => {
    if (e.detail.code === undefined) {
      return;
    }

    getPhoneByWxcode(e.detail.code).then(result => {
      onChange("phone", result.phone);
    });
  };

  return (
    <>
      <View style={{ margin: "32rpx 0rpx 16rpx 0rpx" }}>您的联系方式：</View>
      <View style={{ display: "flex", flexDirection: "row" }}>
        <Button
          style={{ width: "100%", color: phone === "" ? "" : "#aaa" }}
          openType='getPhoneNumber'
          onGetPhoneNumber={getPhoneNumber}
          disabled={phone !== ""}
        >
          {phone ? "授权成功" : "点击授权手机号"}
        </Button>
      </View>
    </>
  );
};

const RegisterCoillterUser = ({ contactInfo, onChange }) => {
  const handleChangeContact = (k, v) => {
    onChange("contact", k, v);
  };
  return (
    <View style={{ padding: "32rpx", color: "#aaa" }}>
      <UserPhone phone={contactInfo.phone} onChange={handleChangeContact} />

      <PrivacyAuthorization />
    </View>
  );
};

export default RegisterCoillterUser;
