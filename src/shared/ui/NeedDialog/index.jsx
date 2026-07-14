import React from "react";
import { View, Navigator, Button } from "@tarojs/components";
import Dialog from "../Dialog";

const NeedDialog = ({ flag, title, content, btnText }) => {
  return (
    <Dialog
      open={flag}
      title={title ?? "提示"}
      closeOnBackdrop={false}
      footer={(
        <Navigator style={{ width: "100%" }} openType="exit" target="miniProgram">
          <Button>{btnText ?? "点击退出小程序"}</Button>
        </Navigator>
      )}
    >
      <View className="s-row-center">
        <View style={{ width: "100%", height: "100%" }} className="s-row-center">
          {content}
        </View>
      </View>
    </Dialog>
  );
};

export default NeedDialog;
