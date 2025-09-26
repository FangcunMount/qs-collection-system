import React from "react";
import Taro from "@tarojs/taro";
import { View, Button } from "@tarojs/components";
import { AtModal, AtModalHeader, AtModalContent, AtModalAction } from "taro-ui";

import { SiBtnToggle } from "taro-ui-fc";
import "taro-ui-fc/dist/styles/btnToggle.less";

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
    <AtModal isOpened={flag} closeOnClickOverlay={false}>
      <AtModalHeader>选择填写人</AtModalHeader>
      <AtModalContent className='s-row-center'>
        <View
          style={{ width: "100%", height: "100%" }}
          className='s-row-center'
        >
          <SiBtnToggle
            value={writerRoleCode}
            options={writerRoles}
            onChange={setWriterRoleCode}
          />
        </View>
      </AtModalContent>
      <AtModalAction>
        <Button onClick={handleOk}>确认</Button>
      </AtModalAction>
    </AtModal>
  );
};
