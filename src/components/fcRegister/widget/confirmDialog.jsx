import React from "react";
import { Button } from "@tarojs/components";
import { AtModal, AtModalHeader, AtModalAction, AtModalContent } from "taro-ui";
import "taro-ui/dist/style/components/modal.scss";
import "taro-ui/dist/style/components/button.scss";

import ConfirmChildList from "./confirmChildList";

const ConfirmDialog = ({ list, flag, onBind, onRegister }) => {
  return (
    <AtModal isOpened={flag} closeOnClickOverlay={false}>
      <AtModalHeader>已有孩子确认</AtModalHeader>
      <AtModalContent className='s-row-center'>
        <ConfirmChildList list={list} onBind={onBind}></ConfirmChildList>
      </AtModalContent>
      <AtModalAction>
        <Button onClick={onRegister}>不，我不认识</Button>
      </AtModalAction>
    </AtModal>
  );
};

export default ConfirmDialog;
