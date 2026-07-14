import React from "react";
import { act, create } from "react-test-renderer";

import Radio from "../radio";
import Checkbox from "../checkbox";

const radioItem = {
  code: "radio-1",
  type: "Radio",
  title: "单选",
  options: [
    { code: "a", content: "A" },
    { code: "b", content: "B" },
  ],
};

const checkboxItem = {
  code: "checkbox-1",
  type: "CheckBox",
  title: "多选",
  options: [
    { code: "a", content: "A" },
    { code: "b", content: "B" },
  ],
};

describe("choice controls", () => {
  test("radio reflects a selection before its parent writes the answer back", () => {
    const onChangeValue = jest.fn();
    let component;
    act(() => {
      component = create(
        <Radio item={radioItem} onChangeValue={onChangeValue} onChangeExtend={jest.fn()} />,
      );
    });

    act(() => {
      component.root.findByType("taroify-group").props.onChange("b");
    });

    expect(onChangeValue).toHaveBeenCalledWith("b", undefined);
    expect(component.root.findAll((node) => (
      node.type === "taroify-component" && node.props.name === "b"
    ))[0].props.className).toContain("is-selected");
  });

  test("checkbox reflects a selection before its parent writes the answer back", () => {
    const onChangeValue = jest.fn();
    let component;
    act(() => {
      component = create(
        <Checkbox item={checkboxItem} onChangeValue={onChangeValue} onChangeExtend={jest.fn()} />,
      );
    });

    act(() => {
      component.root.findByType("taroify-group").props.onChange(["b"]);
    });

    expect(onChangeValue).toHaveBeenCalledWith(["b"], undefined);
    expect(component.root.findAll((node) => (
      node.type === "taroify-component" && node.props.name === "b"
    ))[0].props.className).toContain("is-selected");
  });
});
