import React, { useState } from "react";
import { Text, View } from "@tarojs/components";

import {
  ActionButton,
  Checkbox,
  CheckboxGroup,
  DatePickerField,
  Dialog,
  Empty,
  Field,
  Icon,
  Loading,
  PageShell,
  PickerField,
  Radio,
  RadioGroup,
  Rate,
  Skeleton,
  StatePanel,
  Stepper,
  Toast,
} from "@/shared/ui";
import "./index.less";

const OPTIONS = [
  { label: "本人", value: "self" },
  { label: "家长", value: "parent" },
];

const UiLabPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [radio, setRadio] = useState("a");
  const [checkboxes, setCheckboxes] = useState<string[]>(["a"]);
  const [picker, setPicker] = useState("self");
  const [date, setDate] = useState(new Date(2020, 0, 1));
  const [step, setStep] = useState<number | string>(1);
  const [rate, setRate] = useState(3);

  return (
    <PageShell tone="neutral" className="ui-lab">
      <Text className="ui-lab__title">Qlume UI Lab</Text>
      <Text className="ui-lab__note">仅开发环境路由，用于真机验证遮罩、键盘、安全区和触控行为。</Text>

      <View className="ui-lab__section">
        <Text className="ui-lab__heading">基础反馈</Text>
        <View className="ui-lab__row">
          <ActionButton onClick={() => Toast.show({ message: "操作成功", kind: "success" })}>Toast</ActionButton>
          <ActionButton variant="secondary" onClick={() => setDialogOpen(true)}>Dialog</ActionButton>
          <Icon name="search" size={24} />
          <Loading size={28}>加载中</Loading>
        </View>
        <Dialog open={dialogOpen} title="确认操作" onClose={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} onConfirm={() => setDialogOpen(false)}>
          Dialog 内容与遮罩层验证。
        </Dialog>
      </View>

      <View className="ui-lab__section">
        <Text className="ui-lab__heading">输入与选择</Text>
        <Field label="姓名" placeholder="请输入姓名" required />
        <PickerField label="填写者" value={picker} options={OPTIONS} onChange={setPicker} />
        <DatePickerField label="出生日期" value={date} onChange={setDate} />
        <RadioGroup value={radio} onChange={setRadio}>
          <Radio value="a">选项 A</Radio>
          <Radio value="b">选项 B</Radio>
        </RadioGroup>
        <CheckboxGroup value={checkboxes} onChange={setCheckboxes}>
          <Checkbox value="a">选项 A</Checkbox>
          <Checkbox value="b">选项 B</Checkbox>
        </CheckboxGroup>
        <View className="ui-lab__row">
          <Stepper value={step} min={0} max={10} onChange={setStep} />
          <Rate value={rate} onChange={setRate} />
        </View>
      </View>

      <View className="ui-lab__section">
        <Text className="ui-lab__heading">状态</Text>
        <Skeleton rows={3} title avatar />
        <StatePanel state="error" actionText="重试" onAction={() => undefined} compact />
        <Empty description="暂无测评记录" />
      </View>
    </PageShell>
  );
};

export default UiLabPage;
