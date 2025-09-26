import React from "react";
import { View } from "@tarojs/components";

import RegisterCoillterChild from "./registerCoillterChild";
import RegisterCoillterUser from "./registerCoillterUser";

const RegisterCollecter = ({ role, registerInfo, onChange }) => {
  return (
    <View style={{ flexGrow: 1 }}>
      <View style={{ textAlign: "center" }}>您好，请您填写以下基本信息：</View>
      {role == "child" ? (
        <RegisterCoillterChild
          childInfo={registerInfo.child}
          onChange={onChange}
        />
      ) : null}

      <RegisterCoillterUser
        userInfo={registerInfo.user}
        onChange={onChange}
      ></RegisterCoillterUser>
    </View>
  );
};

export default RegisterCollecter;
