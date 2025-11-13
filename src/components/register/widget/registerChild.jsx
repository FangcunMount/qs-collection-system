import React from "react";
import { View, Input, Text, Image, Picker } from "@tarojs/components";
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

const RegisterChild = ({ childInfo, onChange }) => {
  // 证件类型选项
  const idTypeOptions = [
    { value: "none", label: "无证件" },
    { value: "idcard", label: "身份证" },
    { value: "passport", label: "护照" },
    { value: "birth_cert", label: "出生证明" }
  ];

  // 关系选项
  const relationOptions = [
    { value: "parent", label: "父母" },
    { value: "guardian", label: "监护人" },
    { value: "self", label: "本人" }
  ];

  const getCheckIcon = elGender => {
    if (elGender == childInfo.gender) {
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

  const defaultDate = () => {
    // 获取 6 年前的今天，作为默认日期
    // 格式：YYYY-MM-DD
    const date = new Date();
    const year = date.getFullYear() - 6;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month}-${day}`;
  };

  return (
    <View>
      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>受试者姓名</View>
        <Input
          value={childInfo.legalName}
          onInput={e => onChange("legalName", e.target.value)}
          style={InputCSS}
          placeholder="请填写受试者姓名"
        />
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>受试者性别</View>
        <View style={{ display: "flex", gap: "24rpx" }}>
          <View
            style={sexBody}
            onClick={() => onChange("gender", 1)}
          >
            {getCheckIcon(1)}
            <Image mode="widthFix" src={boyPng} style={sexIcon} />
            <Text style={{ fontSize: "28rpx", color: "#333" }}>男生</Text>
          </View>

          <View
            style={sexBody}
            onClick={() => onChange("gender", 2)}
          >
            {getCheckIcon(2)}
            <Image mode="widthFix" src={girlPng} style={sexIcon} />
            <Text style={{ fontSize: "28rpx", color: "#333" }}>女生</Text>
          </View>
        </View>
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>出生日期</View>
        <SiDatePicker 
          onChange={v => onChange("dob", v)}
          value={defaultDate()}
        >
          <Input
            value={childInfo.dob}
            disabled
            style={InputCSS}
            placeholder="请选择受试者的出生日期"
          />
        </SiDatePicker>
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>证件类型</View>
        <Picker
          mode="selector"
          range={idTypeOptions}
          rangeKey="label"
          value={idTypeOptions.findIndex(item => item.value === childInfo.idType)}
          onChange={e => {
            const selectedOption = idTypeOptions[e.detail.value];
            onChange("idType", selectedOption.value);
          }}
        >
          <View style={{
            ...InputCSS,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
          >
            <Text style={{ color: childInfo.idType ? "#333" : "#999" }}>
              {idTypeOptions.find(item => item.value === childInfo.idType)?.label || "请选择证件类型"}
            </Text>
            <Text style={{ color: "#999" }}>▼</Text>
          </View>
        </Picker>
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>证件号码</View>
        <Input
          value={childInfo.idNo}
          onInput={e => onChange("idNo", e.target.value)}
          style={InputCSS}
          placeholder="请填写证件号码"
        />
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>与受试者关系</View>
        <Picker
          mode="selector"
          range={relationOptions}
          rangeKey="label"
          value={relationOptions.findIndex(item => item.value === childInfo.relation)}
          onChange={e => {
            const selectedOption = relationOptions[e.detail.value];
            onChange("relation", selectedOption.value);
          }}
        >
          <View style={{
            ...InputCSS,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
          >
            <Text style={{ color: childInfo.relation ? "#333" : "#999" }}>
              {relationOptions.find(item => item.value === childInfo.relation)?.label || "请选择关系"}
            </Text>
            <Text style={{ color: "#999" }}>▼</Text>
          </View>
        </Picker>
      </View>

      <View style={{ ...InputWrapperCSS, marginTop: "48rpx" }}>
        <View style={{ ...InputLabelCSS, color: "#666", fontSize: "26rpx" }}>
          可选信息
        </View>
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>身高（厘米）</View>
        <Input
          type="number"
          value={childInfo.heightCm !== null ? String(childInfo.heightCm) : ""}
          onInput={e => {
            const value = e.target.value;
            onChange("heightCm", value ? parseInt(value) : null);
          }}
          style={InputCSS}
          placeholder="选填：受试者身高"
        />
      </View>

      <View style={InputWrapperCSS}>
        <View style={InputLabelCSS}>体重（千克）</View>
        <Input
          type="digit"
          value={childInfo.weightKg}
          onInput={e => onChange("weightKg", e.target.value)}
          style={InputCSS}
          placeholder="选填：受试者体重"
        />
      </View>
    </View>
  );
};

export default RegisterChild;
