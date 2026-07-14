import React from "react";
import { Text, View } from "@tarojs/components";
import { Radio, RadioGroup } from "@/shared/ui";

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
      <RadioGroup value={roleCode} onChange={changeRoleCode} className="writer-role-options">
        {roles.map(role => (
          <Radio key={role.value} value={role.value} className={`writer-role-option ${role.value === roleCode ? "is-selected" : ""}`}>
            {role.label}
          </Radio>
        ))}
      </RadioGroup>
    </View>
  );
}
