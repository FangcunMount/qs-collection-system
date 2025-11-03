import React from "react";
import { View } from "@tarojs/components";

import RegisterCoillterChild from "./registerCoillterChild";
import RegisterCoillterUser from "./registerCoillterUser";

const RegisterCollecter = ({ registerInfo, onChange }) => {
  return (
    <View>
      <View className="section-group">
        <View className="section-title">您的信息</View>
        <RegisterCoillterUser
          contactInfo={registerInfo.contact}
          onChange={onChange}
        ></RegisterCoillterUser>
      </View>
      
      <View className="section-divider"></View>
      
      <View className="section-group">
        <View className="section-title">受试者信息</View>
        <RegisterCoillterChild
          testeeInfo={registerInfo.testee}
          onChange={onChange}
        />
      </View>
    </View>
  );
};

export default RegisterCollecter;
