import React, { useState } from "react";
import PropTypes from "prop-types";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./qsRegister.less";
import RegisterCollecter from "./widget/registerCollecter";
import RegisterFooter from "./widget/registerFooter";
import NeedDialog from "../needDialog";

import { postChildRegister } from "./widget/api";
import { getGlobalData } from "../../util/globalData";
import { useSubmit } from "../../util/useUtil";

const initialRegisterInfo = {
  child: {
    name: "",
    sex: "",
    birthday: "",
    verify: function() {
      if (!this.name) {
        Taro.showToast({ title: "请填写受试者的姓名", icon: "none" });
        return false;
      }

      if (!this.sex) {
        Taro.showToast({ title: "请选择受试者的性别", icon: "none" });
        return false;
      }

      if (!this.birthday) {
        Taro.showToast({ title: "请选择受试者的出生日期", icon: "none" });
        return false;
      }

      return true;
    }
  },
  user: {
    phone: "",
    verify: function() {
      if (!this.phone) {
        Taro.showToast({ title: "请填写您的手机号码", icon: "none" });
        return false;
      }

      return true;
    }
  },
  patient: {
    verify: () => {
      console.log("verifyPatient");
    }
  }
};

const roleMap = {
  child: ["child", "user"],
  patient: ["child", "user", "patient"]
};

// renderParams
const QsRegister = ({ goUrl, role, submitClose }) => {
  const [registerInfo, setRegisterInfo] = useState(() => {
    const tmp = {};
    roleMap[role].map(v => {
      tmp[v] = initialRegisterInfo[v];
    });

    return tmp;
  });

  const [needCloseFlag, setNeedCloseFlag] = useState(false);

  const verify = () => {
    const verifyFlag = Object.keys(registerInfo).reduce((res, v) => {
      if (res) {
        res = registerInfo[v].verify();
      }
      return res;
    }, true);
    return verifyFlag;
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
    const submitData = {};
    Object.keys(registerInfo).map(v => {
      submitData[v] = { ...registerInfo[v] };
      delete submitData[v].verify;
    });

    if (getGlobalData("doctorid")) {
      submitData.source = {
        type: "Doctor",
        id: getGlobalData("doctorid")
      };
    }

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
        role={role}
        registerInfo={registerInfo}
        onChange={handleChangeRegisterInfo}
      ></RegisterCollecter>
      <RegisterFooter submit={handleSubmit}></RegisterFooter>
    </View>
  );
};

QsRegister.prototype = {
  submitClose: PropTypes.bool,
  goUrl: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired
};

export default QsRegister;
