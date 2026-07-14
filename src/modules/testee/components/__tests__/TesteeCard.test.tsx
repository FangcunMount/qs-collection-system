import React from "react";
import renderer from "react-test-renderer";

import TesteeCard from "../TesteeCard";
import type { Testee } from "@/store/testeeStore";

const testee: Testee = {
  id: "testee-1",
  legalName: "小明",
  gender: 1,
  dob: "2020-01-02",
  relation: "parent",
};

const collectText = (node: renderer.ReactTestRendererJSON | string | null): string => {
  if (node == null) return "";
  if (typeof node === "string") return node;
  return (node.children || []).map((child) => collectText(child as renderer.ReactTestRendererJSON | string)).join("");
};

describe("testee card", () => {
  test("renders selected profile and care context", () => {
    const tree = renderer.create(
      <TesteeCard
        testee={testee}
        selected
        careContext={{ clinician_name: "王医生", entry_title: "随访计划" }}
        onOpen={jest.fn()}
        onSelect={jest.fn()}
      />,
    ).toJSON();
    expect(collectText(tree)).toContain("小明");
    expect(collectText(tree)).toContain("当前档案");
    expect(collectText(tree)).toContain("王医生");
    expect(collectText(tree)).not.toContain("设为当前档案");
  });

  test("uses a real button for selecting the current profile", () => {
    const onSelect = jest.fn();
    const component = renderer.create(
      <TesteeCard testee={testee} selected={false} onOpen={jest.fn()} onSelect={onSelect} />,
    );
    const button = component.root.findByType("taro-button");
    const stopPropagation = jest.fn();
    button.props.onClick({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
