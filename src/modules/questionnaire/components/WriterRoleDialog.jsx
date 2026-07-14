import React from "react";
import Taro from "@tarojs/taro";
import { View, Button } from "@tarojs/components";
import { Dialog, Radio, RadioGroup } from "@/shared/ui";

export default props => {
  const { writerRoles, writerRoleCode, flag } = props;
  const { setWriterRoleCode, closeDialog } = props;

  const handleOk = () => {
    if (!writerRoleCode)
      return Taro.showToast({ title: "请先选择填写人", icon: "none" });

    Taro.showModal({
      title: "提示",
      content: "注意，填写人确认后无法修改！",
      success() {
        closeDialog();
      }
    });
  };

  return (
    <Dialog
      open={flag}
      title="选择填写人"
      closeOnBackdrop={false}
      footer={<Button onClick={handleOk}>确认</Button>}
    >
      <View className='s-row-center'>
        <View
          style={{ width: "100%", height: "100%" }}
          className='s-row-center'
        >
          <RadioGroup
            value={writerRoleCode}
            onChange={setWriterRoleCode}
            className="writer-role-options"
          >
            {writerRoles.map(role => (
              <Radio key={role.value} value={role.value} className={`writer-role-option ${role.value === writerRoleCode ? "is-selected" : ""}`}>
                {role.label}
              </Radio>
            ))}
          </RadioGroup>
        </View>
      </View>
    </Dialog>
  );
};
