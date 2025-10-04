import React from "react";
import { View, Input, Text, Image } from "@tarojs/components";
import { SiDatePicker } from "taro-ui-fc";

import boyPng from "../../../assets/images/boy.png";
import girlPng from "../../../assets/images/girl.png";

const InputLabelCSS = {
  margin: "32rpx 0rpx 16rpx 0rpx",
  color: "#666"
};

const InputCSS = {
  padding: "32rpx",
  background: "#eee",
  borderRadius: "8rpx"
};

const sexBody = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexGrow: 1,
  padding: "32rpx",
  background: "#eee",
  borderRadius: "8rpx",
  position: "relative",
  overflow: "hidden"
};

const sexSelected = {
  width: "100%",
  height: "100%",
  position: "absolute",
  left: "0",
  top: "0",
  background: "#478de2",
  opacity: ".4"
};

const sexSelectedIcon = {
  width: "28rpx",
  height: "52rpx",
  position: "absolute",
  top: "20rpx",
  left: "160rpx",
  border: "8rpx solid #fff",
  borderLeft: "0",
  borderTop: "0",
  transform: "rotate(45deg) scaleY(1)",
  transition: "transform .15s ease-in .05s",
  transformOrigin: "center"
};

const sexIcon = {
  width: "60rpx",
  height: "60rpx",
  marginRight: "32rpx"
};

const ChildName = ({ name, onChange }) => {
  return (
    <>
      <View style={InputLabelCSS}>受试者的姓名：</View>
      <Input
        value={name}
        onInput={e => onChange("name", e.target.value)}
        style={InputCSS}
        placeholder="请填写受试者姓名"
      ></Input>
    </>
  );
};

const ChildSex = ({ sex, onChange }) => {
  const getCheckIcon = elSex => {
    if (elSex == sex) {
      return (
        <>
          <View style={sexSelected} />
          <View style={sexSelectedIcon} />
        </>
      );
    } else {
      return null;
    }
  };
  return (
    <>
      <View style={InputLabelCSS}>受试者的性别：</View>
      <View style={{ display: "flex" }}>
        <View
          style={{ ...sexBody, marginRight: "32rpx" }}
          onClick={() => onChange("sex", "1")}
        >
          {getCheckIcon("1")}
          <Image mode="widthFix" src={boyPng} style={sexIcon}></Image>
          <Text>男生</Text>
        </View>

        <View
          style={{ ...sexBody, marginLeft: "32rpx" }}
          onClick={() => onChange("sex", "2")}
        >
          {getCheckIcon("2")}
          <Image mode="widthFix" src={girlPng} style={sexIcon}></Image>
              <Text>女生</Text>
        </View>
      </View>
    </>
  );
};

const ChildBirthday = ({ birthday, onChange }) => {
  const defaultDate = () => {
    // 获取 6 年前的今天，作为默认日期
    // 格式：YYYY-MM-DD
    const date = new Date();
    const year = date.getFullYear() - 6;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month}-${day}`;
  }

  return (
    <>
      <View style={InputLabelCSS}>受试者的生日：</View>
      <SiDatePicker 
        onChange={v => onChange("birthday", v)}
        value={ defaultDate() }
        >
        <Input
          value={birthday}
          disabled
          style={InputCSS}
          placeholder="请选择受试者的出生日期"
        ></Input>
      </SiDatePicker>
    </>
  );
};

const RegisterCoillterChild = ({ testeeInfo, onChange }) => {
  const handleChangeTestee = (k, v) => {
    onChange("testee", k, v);
  };

  return (
    <View style={{ padding: "32rpx" }}>
      <ChildName name={testeeInfo.name} onChange={handleChangeTestee} />
      <ChildSex sex={testeeInfo.sex} onChange={handleChangeTestee} />
      <ChildBirthday
        birthday={testeeInfo.birthday}
        onChange={handleChangeTestee}
      />
    </View>
  );
};

export default RegisterCoillterChild;
