import React, { useState } from "react";
import PropTypes from "prop-types";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./fcRegister.less";
import RegisterCollecter from "./widget/registerCollecter";
import RegisterFooter from "./widget/registerFooter";
import NeedDialog from "../needDialog";
import ConfirmDialog from "./widget/confirmDialog";
import BindDialog from "./widget/bindDialog";

import { postChildRegister, getChildConfirm } from "./widget/api";
import { getGlobalData } from "../../util/globalData";
import { useSubmit } from "../../util/useUtil";

const initialRegisterInfo = {
  child: {
    name: "",
    sex: "",
    birthday: "",
    verify: function() {
      if (!this.name) {
        Taro.showToast({ title: "请填写孩子的姓名", icon: "none" });
        return false;
      }

      if (!this.sex) {
        Taro.showToast({ title: "请选择孩子的性别", icon: "none" });
        return false;
      }

      if (!this.birthday) {
        Taro.showToast({ title: "请选择孩子的出生日期", icon: "none" });
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
const FcRegister = ({ goUrl, role, submitClose }) => {
  const [registerInfo, setRegisterInfo] = useState(() => {
    const tmp = {};
    roleMap[role].map(v => {
      tmp[v] = initialRegisterInfo[v];
    });

    return tmp;
  });

  const [needConfirmData, setNeedConfirmData] = useState({
    childid: "",
    phone: ""
  });

  const [childConfirmList, setChildConfirmList] = useState([]);
  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const [confirmFlag, setConfirmFlag] = useState(false);
  const [bindFlag, setBindFlag] = useState(false);

  const verify = () => {
    const verifyFlag = Object.keys(registerInfo).reduce((res, v) => {
      if (res) {
        res = registerInfo[v].verify();
      }
      return res;
    }, true);
    return verifyFlag;
  };

  const [, childConfirm] = useSubmit({
    beforeSubmit: () => verify(),
    submit: async () => {
      const childInfo = { ...registerInfo["child"] };
      delete childInfo.verify;

      const res = await getChildConfirm(childInfo);
      if (res.list.length > 0) {
        setChildConfirmList(res.list);
        setConfirmFlag(true);
        return;
      }

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

  const childbind = (phone, childid) => {
    setNeedConfirmData({ childid, phone });
    setConfirmFlag(false);
    setBindFlag(true);
  };

  return (
    <View className="register-container">
      <ConfirmDialog
        flag={confirmFlag}
        list={childConfirmList}
        onBind={childbind}
        onRegister={childRegister}
      ></ConfirmDialog>
      <BindDialog
        flag={bindFlag}
        phone={needConfirmData.phone}
        childid={needConfirmData.childid}
        userPhone={registerInfo.user.phone}
        onBack={() => {
          setBindFlag(false);
          setConfirmFlag(true);
        }}
        onOk={afterSubmit}
      ></BindDialog>
      <NeedDialog
        flag={needCloseFlag}
        content="注册完成，点击下方按钮关闭小程序"
      ></NeedDialog>
      <RegisterCollecter
        role={role}
        registerInfo={registerInfo}
        onChange={handleChangeRegisterInfo}
      ></RegisterCollecter>
      <RegisterFooter submit={childConfirm}></RegisterFooter>
    </View>
  );
};

FcRegister.prototype = {
  submitClose: PropTypes.bool,
  goUrl: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired
};

export default FcRegister;
