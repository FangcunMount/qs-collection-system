import React from "react";
import { View } from "@tarojs/components";

import RegisterCoillterChild from "./registerCoillterChild";
import RegisterCoillterUser from "./registerCoillterUser";

const RegisterCollecter = ({ registerInfo, onChange }) => {
  return (
    <View style={{ flexGrow: 1 }}>
      <View style={{ textAlign: "center" }}>您好，请您填写以下基本信息：</View>
      <RegisterCoillterChild
        testeeInfo={registerInfo.testee}
        onChange={onChange}
      />
      <RegisterCoillterUser
        contactInfo={registerInfo.contact}
        onChange={onChange}
      ></RegisterCoillterUser>
    </View>
  );
};

export default RegisterCollecter;
