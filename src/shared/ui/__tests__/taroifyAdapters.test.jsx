import React from "react";
import renderer from "react-test-renderer";

import {
  Checkbox,
  CheckboxGroup,
  Dialog,
  Field,
  Icon,
  Radio,
  RadioGroup,
} from "@/shared/ui";

describe("Qlume Taroify adapters", () => {
  test("RadioGroup forwards the original option code", () => {
    const onChange = jest.fn();
    const component = renderer.create(
      <RadioGroup value="A" onChange={onChange}>
        <Radio value="A">选项 A</Radio>
        <Radio value="B">选项 B</Radio>
      </RadioGroup>
    );

    component.root.findByType("taroify-group").props.onChange("B");

    expect(onChange).toHaveBeenCalledWith("B");
    expect(component.root.findAllByType("taroify-component")[1].props.name).toBe("B");
  });

  test("CheckboxGroup preserves raw codes and group limits", () => {
    const onChange = jest.fn();
    const component = renderer.create(
      <CheckboxGroup value={["sleep"]} max={2} onChange={onChange}>
        <Checkbox value="sleep">睡眠</Checkbox>
        <Checkbox value="mood">情绪</Checkbox>
      </CheckboxGroup>
    );
    const group = component.root.findByType("taroify-group");

    group.props.onChange(["sleep", "mood"]);

    expect(group.props.max).toBe(2);
    expect(onChange).toHaveBeenCalledWith(["sleep", "mood"]);
  });

  test("Field exposes labels, errors and normalized string values", () => {
    const onValueChange = jest.fn();
    const component = renderer.create(
      <Field label="姓名" required error="请填写姓名" onValueChange={onValueChange} />
    );
    const input = component.root.findByType("taroify-component");

    input.props.onChange({ detail: { value: 1024 } });

    expect(onValueChange).toHaveBeenCalledWith("1024");
    expect(component.root.findAllByType("taro-text").map((node) => node.children.join("")))
      .toEqual(expect.arrayContaining(["请填写姓名"]));
  });

  test("Dialog and Icon keep stable Qlume semantics", () => {
    const onConfirm = jest.fn();
    const dialog = renderer.create(
      <Dialog open title="确认提交" onConfirm={onConfirm}>内容</Dialog>
    ).root.findByType("taroify-component");
    const icon = renderer.create(
      <Icon name="search" size={24} color="#6657D9" />
    ).root.findByType("taroify-search");

    dialog.props.onConfirm();

    expect(dialog.props).toMatchObject({ open: true, confirm: "确定", cancel: "取消" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(icon.props).toMatchObject({ size: 24, color: "#6657D9" });
  });
});
