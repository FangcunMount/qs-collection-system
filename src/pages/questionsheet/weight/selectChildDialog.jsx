import React, { useState } from "react";
import { showToast } from "@tarojs/taro";
import { AtModal, AtModalHeader, AtModalContent, AtModalAction } from "taro-ui";
import { View } from "@tarojs/components";
import { SiRadio } from "taro-ui-fc";

import "./selectChildDialog.less";

const NeedDialog = ({ flag, title, childList, onSelectChild, onAddChild }) => {
  const [selectChild, setSelectChild] = useState(null);

  const handleSelect = v => {
    setSelectChild(v);
  };

  const handleSubmit = () => {
    if (selectChild === null) {
      return showToast({
        title: "请选择受试者",
        icon: "none"
      });
    }
    onSelectChild(selectChild);
  };

  const handleAddChild = () => {
    onAddChild();
  };

  return (
    <AtModal
      className="select-child--modal"
      isOpened={flag}
      closeOnClickOverlay={false}
    >
      <AtModalContent className="s-row-center select-child--content">
        <View className="select-child--modal__header">
          {title ?? "选择受试者"}
        </View>
        <View className="select-child--modal__container">
          <SiRadio
            bordered={false}
            options={childList}
            labelKey="name"
            valueKey="id"
            onChange={handleSelect}
          ></SiRadio>
        </View>
      </AtModalContent>
      <AtModalAction style="">
        <View onClick={handleSubmit} className="dialog-btn">
          确定
        </View>
      </AtModalAction>
    </AtModal>
  );
};

export default NeedDialog;
