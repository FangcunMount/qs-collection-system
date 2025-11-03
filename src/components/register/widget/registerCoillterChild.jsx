import React from "react";
import { View, Input, Text, Image } from "@tarojs/components";
import { SiDatePicker } from "taro-ui-fc";

import boyPng from "../../../assets/images/boy.png";
import girlPng from "../../../assets/images/girl.png";

const InputLabelCSS = {
  margin: "0 0 16rpx 0",
  color: "#333",
  fontSize: "28rpx",
  fontWeight: "500"
};

const InputCSS = {
  padding: "28rpx 24rpx",
  background: "#f7f8fa",
  borderRadius: "12rpx",
  fontSize: "28rpx",
  border: "2rpx solid transparent",
  transition: "all 0.3s ease"
};

const InputWrapperCSS = {
  marginBottom: "32rpx"
};

const sexBody = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexGrow: 1,
  padding: "36rpx 24rpx",
  background: "#f7f8fa",
  borderRadius: "12rpx",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s ease"
};

const sexSelected = {
  width: "100%",
  height: "100%",
  position: "absolute",
  left: "0",
  top: "0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  opacity: ".15"
};

const sexSelectedIcon = {
  width: "28rpx",
  height: "52rpx",
  position: "absolute",
  top: "24rpx",
  right: "24rpx",
  border: "8rpx solid #667eea",
  borderLeft: "0",
  borderTop: "0",
  transform: "rotate(45deg) scaleY(1)",
  transition: "transform .15s ease-in .05s",
  transformOrigin: "center"
};

const sexIcon = {
  width: "64rpx",
  height: "64rpx",
  marginRight: "16rpx"
};

const ChildName = ({ name, onChange }) => {
  return (
    <View style={InputWrapperCSS}>
      <View style={InputLabelCSS}>受试者姓名</View>
      <Input
        value={name}
        onInput={e => onChange("name", e.target.value)}
        style={InputCSS}
        placeholder="请填写受试者姓名"
      ></Input>
    </View>
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
    <View style={InputWrapperCSS}>
      <View style={InputLabelCSS}>受试者性别</View>
      <View style={{ display: "flex", gap: "24rpx" }}>
        <View
          style={sexBody}
          onClick={() => onChange("sex", "1")}
        >
          {getCheckIcon("1")}
          <Image mode="widthFix" src={boyPng} style={sexIcon}></Image>
          <Text style={{ fontSize: "28rpx", color: "#333" }}>男生</Text>
        </View>

        <View
          style={sexBody}
          onClick={() => onChange("sex", "2")}
        >
          {getCheckIcon("2")}
          <Image mode="widthFix" src={girlPng} style={sexIcon}></Image>
          <Text style={{ fontSize: "28rpx", color: "#333" }}>女生</Text>
        </View>
      </View>
    </View>
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
    <View style={InputWrapperCSS}>
      <View style={InputLabelCSS}>出生日期</View>
      <SiDatePicker 
        onChange={v => onChange("birthday", v)}
        value={defaultDate()}
      >
        <Input
          value={birthday}
          disabled
          style={InputCSS}
          placeholder="请选择受试者的出生日期"
        ></Input>
      </SiDatePicker>
    </View>
  );
};

const RegisterCoillterChild = ({ testeeInfo, onChange }) => {
  const handleChangeTestee = (k, v) => {
    onChange("testee", k, v);
  };

  return (
    <View>
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
