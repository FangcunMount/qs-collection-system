import React, { useState, useEffect } from "react";
import { View, Button } from "@tarojs/components";
import { AtModal, AtModalHeader, AtModalAction, AtModalContent } from "taro-ui";
import "taro-ui/dist/style/components/modal.scss";
import "taro-ui/dist/style/components/button.scss";

import VerificationCode from "./verificationCode";

import { postChildBind } from "./api";
import { useSubmit } from "../../../util/useUtil";

const phoneRow = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "32rpx"
};

const errnomsg = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "red"
};

const PhoneConfirm = ({ phone, value, onChange }) => {
  return (
    <View style={phoneRow}>
      <View>{phone.slice(0, 3)}</View>
      <VerificationCode
        value={value}
        onChange={onChange}
        vertifyNum={4}
      ></VerificationCode>
      <View>{phone.slice(7)}</View>
    </View>
  );
};

const BindDialog = ({ phone, childid, userPhone, flag, onBack, onOk }) => {
  const [missingPhoneNumber, setMissingPhoneNumber] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    setMissingPhoneNumber("");
    setShowError(false);
  }, [flag]);

  useEffect(() => {
    setShowError(false);
  }, [missingPhoneNumber]);

  const [, handleBind] = useSubmit({
    beforeSubmit: () => {
      if (phone.slice(3, 7) != missingPhoneNumber) {
        setShowError(true);
        return false;
      }
      return true;
    },
    submit: async () => {
      await postChildBind(childid, userPhone);
      onOk();
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "绑定中..."
    }
  });

  return (
    <AtModal isOpened={flag} closeOnClickOverlay={false}>
      <AtModalHeader>验证手机号</AtModalHeader>
      <AtModalContent className="s-row-center">
        <PhoneConfirm
          phone={phone}
          value={missingPhoneNumber}
          onChange={v => setMissingPhoneNumber(v)}
        />
        {showError ? <View style={errnomsg}>*信息有误，请重试</View> : null}
      </AtModalContent>
      <AtModalAction>
        <Button onClick={onBack}>返回</Button>
        <Button onClick={handleBind}>确认</Button>
      </AtModalAction>
    </AtModal>
  );
};

export default BindDialog;
