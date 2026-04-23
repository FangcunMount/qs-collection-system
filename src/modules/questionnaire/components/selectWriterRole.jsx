import React from "react";
import { Text, View } from "@tarojs/components";

import { SiBtnToggle } from "taro-ui-fc";

export default function SelectWriterRole({ roles, roleCode, changeRoleCode }) {
  return (
    <View style={{ padding: "30rpx" }}>
      <Text
        style={{
          fontSize: "28rpx",
          fontWeight: "bold",
          color: "#222222"
        }}
      >
        填写人：
      </Text>
      <SiBtnToggle value={roleCode} options={roles} onChange={changeRoleCode} />
    </View>
  );
}
