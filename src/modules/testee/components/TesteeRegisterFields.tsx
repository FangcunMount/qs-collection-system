import React from "react";
import { Button, Image, Input, Picker, Text, View } from "@tarojs/components";

import boyPng from "@/pages/testees/assets/images/boy.png";
import girlPng from "@/pages/testees/assets/images/girl.png";
import FormField from "@/shared/ui/FormField";
import type { TesteeFormDraft } from "../lib/testeeForm";

const relationOptions = [
  { value: "self", label: "本人" },
  { value: "parent", label: "父母" },
  { value: "grandparent", label: "祖父母" },
  { value: "other", label: "其他" },
];

interface TesteeRegisterFieldsProps {
  profileInfo: TesteeFormDraft;
  error?: string;
  onChange: <K extends keyof TesteeFormDraft>(key: K, value: TesteeFormDraft[K]) => void;
}

const errorFor = (error: string, field: keyof TesteeFormDraft) => {
  if (field === "legalName" && error.includes("姓名")) return error;
  if (field === "gender" && error.includes("性别")) return error;
  if (field === "dob" && error.includes("出生日期")) return error;
  if (field === "relation" && error.includes("关系")) return error;
  return "";
};

const TesteeRegisterFields = ({ profileInfo, error = "", onChange }: TesteeRegisterFieldsProps) => {
  const relationIndex = Math.max(0, relationOptions.findIndex((item) => item.value === profileInfo.relation));
  const relationLabel = relationOptions.find((item) => item.value === profileInfo.relation)?.label || "请选择与您的关系";
  return (
    <>
      <FormField label="档案姓名" required error={errorFor(error, "legalName")}>
        <Input
          className="form-control"
          value={profileInfo.legalName}
          placeholder="请填写档案姓名"
          onInput={(event) => onChange("legalName", event.detail.value)}
        />
      </FormField>
      <FormField label="档案性别" required error={errorFor(error, "gender")}>
        <View className="gender-options">
          {([{ value: 1, label: "男生", image: boyPng }, { value: 2, label: "女生", image: girlPng }] as const).map((option) => (
            <Button
              key={option.value}
              className={`gender-option ${profileInfo.gender === option.value ? "gender-option--selected" : ""}`}
              onClick={() => onChange("gender", option.value)}
            >
              <Image mode="widthFix" src={option.image} className="gender-option__image" />
              <Text>{option.label}</Text>
            </Button>
          ))}
        </View>
      </FormField>
      <FormField label="出生日期" required error={errorFor(error, "dob")}>
        <Picker mode="date" value={profileInfo.dob} onChange={(event) => onChange("dob", event.detail.value)}>
          <View className="form-control form-control--picker">
            <Text>{profileInfo.dob || "请选择档案的出生日期"}</Text><Text className="form-picker-arrow">›</Text>
          </View>
        </Picker>
      </FormField>
      <FormField label="与您的关系" required error={errorFor(error, "relation")}>
        <Picker
          mode="selector"
          range={relationOptions}
          rangeKey="label"
          value={relationIndex}
          onChange={(event) => onChange("relation", relationOptions[Number(event.detail.value)]?.value || "parent")}
        >
          <View className="form-control form-control--picker">
            <Text>{relationLabel}</Text><Text className="form-picker-arrow">›</Text>
          </View>
        </Picker>
      </FormField>
    </>
  );
};

export default TesteeRegisterFields;
