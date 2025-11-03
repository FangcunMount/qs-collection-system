import React, { useState } from "react";
import PropTypes from "prop-types";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./register.less";
import RegisterUser from "./widget/registerUser";
import RegisterChild from "./widget/registerChild";
import RegisterFooter from "./widget/registerFooter";
import NeedDialog from "../needDialog";

import { postUserRegister, postChildRegister } from "./widget/api";
import { useSubmit } from "../../util/useUtil";
import { addTestee, setSelectedTesteeId } from "../../store";

/**
 * 注册类型枚举
 */
export const REGISTER_TYPE = {
  USER: 'user',
  CHILD: 'child'
};

const createInitialUserInfo = () => ({
  username: "",
  phone: ""
});

const createInitialChildInfo = () => ({
  name: "",
  sex: "",
  birthday: ""
});

/**
 * 统一注册组件
 * @param {Object} props
 * @param {string} props.type - 注册类型: 'user' | 'child'
 * @param {string} props.goUrl - 注册成功后跳转的URL
 * @param {boolean} props.submitClose - 是否在提交后关闭小程序
 */
const Register = ({ type, goUrl, submitClose }) => {
  const isUserRegister = type === REGISTER_TYPE.USER;
  
  const [userInfo, setUserInfo] = useState(createInitialUserInfo);
  const [childInfo, setChildInfo] = useState(createInitialChildInfo);
  const [needCloseFlag, setNeedCloseFlag] = useState(false);

  // 验证用户信息
  const verifyUserInfo = () => {
    if (!userInfo.username) {
      Taro.showToast({ title: "请填写您的姓名", icon: "none" });
      return false;
    }

    if (!userInfo.phone) {
      Taro.showToast({ title: "请填写您的手机号码", icon: "none" });
      return false;
    }

    return true;
  };

  // 验证受试者信息
  const verifyChildInfo = () => {
    if (!childInfo.name) {
      Taro.showToast({ title: "请填写受试者的姓名", icon: "none" });
      return false;
    }

    if (!childInfo.sex) {
      Taro.showToast({ title: "请选择受试者的性别", icon: "none" });
      return false;
    }

    if (!childInfo.birthday) {
      Taro.showToast({ title: "请选择受试者的出生日期", icon: "none" });
      return false;
    }

    return true;
  };

  // 注册提交
  const [, handleSubmit] = useSubmit({
    beforeSubmit: () => isUserRegister ? verifyUserInfo() : verifyChildInfo(),
    submit: async () => {
      if (isUserRegister) {
        await registerUser();
      } else {
        await registerChild();
      }
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "注册中..."
    }
  });

  // 注册用户
  const registerUser = async () => {
    try {
      console.log('[Register] 注册用户');
      const userPayload = {
        nickname: userInfo.username,
        avatar: "",
        contacts: [
          {
            type: "phone",
            value: userInfo.phone
          }
        ]
      };
      
      const userRes = await postUserRegister(userPayload);
      console.log('[Register] 用户注册成功:', userRes);
      
      // 注册成功，保存用户信息到本地存储（可选）
      Taro.setStorageSync('userInfo', userRes);
      
      afterSubmit();
    } catch (error) {
      console.error('[Register] 用户注册失败:', error);
      Taro.showToast({ 
        title: error.message || "注册失败，请重试", 
        icon: "none" 
      });
      throw error;
    }
  };

  // 注册受试者
  const registerChild = async () => {
    try {
      console.log('[Register] 注册受试者');
      const childPayload = {
        name: childInfo.name,
        sex: childInfo.sex,
        birthday: childInfo.birthday
      };
      
      const childRes = await postChildRegister(childPayload);
      console.log('[Register] 受试者注册成功:', childRes);
      
      // 注册成功后的处理
      if (childRes.childid || childRes.id) {
        const childId = childRes.childid || childRes.id;
        const newTestee = {
          id: childId,
          name: childInfo.name
        };
        addTestee(newTestee);
        setSelectedTesteeId(childId);
        afterSubmit();
      }
    } catch (error) {
      console.error('[Register] 受试者注册失败:', error);
      Taro.showToast({ 
        title: error.message || "注册失败，请重试", 
        icon: "none" 
      });
      throw error;
    }
  };

  const afterSubmit = () => {
    if (submitClose) {
      setNeedCloseFlag(true);
    } else {
      Taro.redirectTo({ url: goUrl });
    }
  };

  // 更新用户信息
  const handleChangeUserInfo = (key, value) => {
    setUserInfo({
      ...userInfo,
      [key]: value
    });
  };

  // 更新受试者信息
  const handleChangeChildInfo = (key, value) => {
    setChildInfo({
      ...childInfo,
      [key]: value
    });
  };

  const headerConfig = isUserRegister 
    ? { title: "用户注册", subtitle: "请填写您的基本信息" }
    : { title: "受试者注册", subtitle: "请填写受试者的基本信息" };

  return (
    <View className="register-container">
      <NeedDialog
        flag={needCloseFlag}
        content="注册完成，点击下方按钮关闭小程序"
      />
      
      <View className="register-header">
        <View className="register-title">{headerConfig.title}</View>
        <View className="register-subtitle">{headerConfig.subtitle}</View>
      </View>
      
      <View className="register-card">
        {isUserRegister ? (
          <RegisterUser
            userInfo={userInfo}
            onChange={handleChangeUserInfo}
          />
        ) : (
          <RegisterChild
            childInfo={childInfo}
            onChange={handleChangeChildInfo}
          />
        )}
      </View>
      
      <RegisterFooter 
        submit={handleSubmit}
        buttonText="立即注册"
      />
    </View>
  );
};

Register.propTypes = {
  type: PropTypes.oneOf([REGISTER_TYPE.USER, REGISTER_TYPE.CHILD]).isRequired,
  goUrl: PropTypes.string.isRequired,
  submitClose: PropTypes.bool
};

Register.defaultProps = {
  submitClose: false
};

export default Register;
