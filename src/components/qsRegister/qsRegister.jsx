import React, { useState } from "react";
import PropTypes from "prop-types";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./qsRegister.less";
import RegisterCollecter from "./widget/registerCollecter";
import RegisterFooter from "./widget/registerFooter";
import NeedDialog from "../needDialog";

import { postChildRegister } from "./widget/api";
import { useSubmit } from "../../util/useUtil";

const createInitialRegisterInfo = () => ({
  testee: {
    name: "",
    sex: "",
    birthday: ""
  },
  contact: {
    phone: ""
  }
});

const QsRegister = ({ goUrl, submitClose }) => {
  const [registerInfo, setRegisterInfo] = useState(createInitialRegisterInfo);

  const [needCloseFlag, setNeedCloseFlag] = useState(false);

  const verify = () => {
    const { testee, contact } = registerInfo;

    if (!testee.name) {
      Taro.showToast({ title: "请填写受试者的姓名", icon: "none" });
      return false;
    }

    if (!testee.sex) {
      Taro.showToast({ title: "请选择受试者的性别", icon: "none" });
      return false;
    }

    if (!testee.birthday) {
      Taro.showToast({ title: "请选择受试者的出生日期", icon: "none" });
      return false;
    }

    if (!contact.phone) {
      Taro.showToast({ title: "请填写您的手机号码", icon: "none" });
      return false;
    }

    return true;
  };

  const [, handleSubmit] = useSubmit({
    beforeSubmit: () => verify(),
    submit: async () => {
      await childRegister();
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "注册中..."
    }
  });

  const childRegister = async () => {
    const submitData = {
      child: { ...registerInfo.testee },
      user: { ...registerInfo.contact }
    };

    const res = await postChildRegister(submitData);
    if (res.childid) afterSubmit();
  };

  const afterSubmit = () => {
    if (submitClose) {
      setNeedCloseFlag(true);
    } else {
      Taro.redirectTo({ url: goUrl });
    }
  };

  const handleChangeRegisterInfo = (type, key, value) => {
    setRegisterInfo({
      ...registerInfo,
      [type]: {
        ...registerInfo[type],
        [key]: value
      }
    });
  };

  return (
    <View className="register-container">
      <NeedDialog
        flag={needCloseFlag}
        content="注册完成，点击下方按钮关闭小程序"
      ></NeedDialog>
      <RegisterCollecter
        registerInfo={registerInfo}
        onChange={handleChangeRegisterInfo}
      ></RegisterCollecter>
      <RegisterFooter submit={handleSubmit}></RegisterFooter>
    </View>
  );
};

QsRegister.propTypes = {
  submitClose: PropTypes.bool,
  goUrl: PropTypes.string.isRequired
};

QsRegister.defaultProps = {
  submitClose: false
};

export default QsRegister;
