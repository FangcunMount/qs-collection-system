import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./register.less";
import RegisterUser from "./widget/registerUser";
import RegisterChild from "./widget/registerChild";
import RegisterFooter from "./widget/registerFooter";
import NeedDialog from "../needDialog";

import { registerChildComplete } from "../../services/registerService.ts";
import { useSubmit } from "../../util/useUtil";
import { setSelectedTesteeId } from "../../store/testeeStore.ts";
import { registerUser } from "./model";
import { authorizationHandler } from "../../util/authorization";
import config from "../../config";

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
  legalName: "",
  gender: null,
  dob: "",
  idType: "none",
  idNo: "",
  relation: "parent",
  heightCm: null,
  weightKg: ""
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
  const isMountedRef = useRef(true);

  // 组件卸载时标记
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    if (!childInfo.legalName) {
      Taro.showToast({ title: "请填写受试者的姓名", icon: "none" });
      return false;
    }

    if (childInfo.gender === null) {
      Taro.showToast({ title: "请选择受试者的性别", icon: "none" });
      return false;
    }

    if (!childInfo.dob) {
      Taro.showToast({ title: "请选择受试者的出生日期", icon: "none" });
      return false;
    }

    if (!childInfo.idType) {
      Taro.showToast({ title: "请选择证件类型", icon: "none" });
      return false;
    }

    if (!childInfo.idNo) {
      Taro.showToast({ title: "请填写证件号码", icon: "none" });
      return false;
    }

    if (!childInfo.relation) {
      Taro.showToast({ title: "请选择与受试者的关系", icon: "none" });
      return false;
    }

    return true;
  };

  // 注册用户
  const registerUserHandler = async () => {
    try {
      console.log('[Register] 注册用户', userInfo);
      const userRes = await registerUser(userInfo);
      console.log('[Register] 用户注册成功:', userRes);
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) {
        console.warn('[Register] 组件已卸载，跳过后续操作');
        return;
      }
      
      // 注册成功，保存用户信息到本地存储（可选）
      Taro.setStorageSync('userInfo', userRes);
      
      // 尝试自动登录，然后跳转到首页
      try {
        const token = await authorizationHandler.login({ appId: config.appId });
        console.log('[Register] 自动登录成功，token:', token);
        
        // login 方法已经通过 tokenStore 保存了完整的 token 数据
        // 使用 reLaunch 以清空页面栈，回到首页
        Taro.reLaunch({ url: '/pages/home/index/index' });
        return;
      } catch (loginErr) {
        console.warn('[Register] 自动登录失败，回退到原有跳转逻辑', loginErr);
        afterSubmit();
      }
    } catch (error) {
      console.error('[Register] 用户注册失败:', error);
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) {
        console.warn('[Register] 组件已卸载，跳过错误处理');
        return;
      }
      
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
      // 准备注册数据 - registerService 需要特定的字段名
      const childPayload = {
        name: childInfo.legalName,           // 映射到 name
        birthday: childInfo.dob,              // 映射到 birthday
        sex: childInfo.gender,                // 映射到 sex
        idType: childInfo.idType,
        idNo: childInfo.idNo
      };
      
      // 添加可选字段
      if (childInfo.heightCm !== null && childInfo.heightCm !== '') {
        childPayload.heightCm = Number(childInfo.heightCm);
      }
      if (childInfo.weightKg) {
        childPayload.weightKg = Number(childInfo.weightKg);
      }
      
      console.log('[Register] 准备调用 registerService, payload:', childPayload);
      
      // 使用新的 registerService 完成完整的注册流程
      // 这会自动处理 IAM 注册 → Collection 创建 → Store 更新
      const { childId, testeeId } = await registerChildComplete(childPayload);
      console.log('[Register] 受试者注册成功, childId:', childId, 'testeeId:', testeeId);

      // 检查组件是否仍然挂载
      if (!isMountedRef.current) {
        console.warn('[Register] 组件已卸载，跳过后续操作');
        return;
      }

      // 设置当前选中的受试者
      setSelectedTesteeId(testeeId);
      afterSubmit();
    } catch (error) {
      console.error('[Register] 受试者注册失败:', error);
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) {
        console.warn('[Register] 组件已卸载，跳过错误处理');
        return;
      }
      
      Taro.showToast({ 
        title: error.message || "注册失败，请重试", 
        icon: "none" 
      });
      throw error;
    }
  };

  // 注册提交
  const [, handleSubmit] = useSubmit({
    beforeSubmit: () => isUserRegister ? verifyUserInfo() : verifyChildInfo(),
    submit: async () => {
      if (isUserRegister) {
        await registerUserHandler();
      } else {
        await registerChild();
      }
    },
    options: {
      needGobalLoading: true,
      gobalLoadingTips: "注册中..."
    }
  });

  const afterSubmit = () => {
    if (submitClose) {
      setNeedCloseFlag(true);
    } else if (goUrl) {
      Taro.redirectTo({ url: goUrl });
    } else {
      // 根据注册类型跳转到不同页面
      if (isUserRegister) {
        // 用户注册成功，返回上一页或首页
        Taro.navigateBack({ delta: 1 });
      } else {
        // 受试者注册成功，跳转到受试者列表页面
        Taro.redirectTo({ url: '/pages/testee/list/index' });
      }
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
