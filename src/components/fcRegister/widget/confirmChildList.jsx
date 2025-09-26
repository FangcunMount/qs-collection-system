import React from "react";
import { View } from "@tarojs/components";
import { AtButton } from "taro-ui";

import "taro-ui/dist/style/components/button.scss";

import "./confirmChildList.css";

const ConfirmChildList = ({ list, onBind }) => {
  return (
    <View>
      {list.map(v => {
        return (
          <View className='list-box' key={v.phone}>
            <View className='list-phone'>
              {v.phone.slice(0, 3)}****{v.phone.slice(7)}
            </View>
            <AtButton
              type='primary'
              size='small'
              className='list-button'
              onClick={() => onBind(v.phone, v.childid)}
            >
              点击绑定
            </AtButton>
          </View>
        );
      })}
    </View>
  );
};

export default ConfirmChildList;
