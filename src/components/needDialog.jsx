import React from "react";
import { AtModal, AtModalHeader, AtModalContent, AtModalAction } from "taro-ui";
import "taro-ui/dist/style/components/modal.scss";

import { View, Navigator, Button } from "@tarojs/components";

const NeedDialog = ({ flag, title, content, btnText }) => {
  return (
    <AtModal isOpened={flag} closeOnClickOverlay={false}>
      <AtModalHeader>{title ?? "提示"}</AtModalHeader>
      <AtModalContent className='s-row-center'>
        <View
          style={{ width: "100%", height: "100%" }}
          className='s-row-center'
        >
          {content}
        </View>
      </AtModalContent>
      <AtModalAction>
        {" "}
        <Navigator
          style={{ width: "100%" }}
          openType='exit'
          target='miniProgram'
        >
          <Button>{btnText ?? "点击退出小程序"}</Button>
        </Navigator>{" "}
      </AtModalAction>
    </AtModal>
  );
};

export default NeedDialog;
