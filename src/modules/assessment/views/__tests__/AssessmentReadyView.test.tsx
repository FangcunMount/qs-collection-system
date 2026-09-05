import React from "react";
import renderer, { act } from "react-test-renderer";
import ActionButton from "@/shared/ui/ActionButton";

import AssessmentReadyView from "../AssessmentReadyView";

describe("AssessmentReadyView", () => {
  test("uses native disabled semantics and local cover fallback from the view model", () => {
    const component = renderer.create(
      <AssessmentReadyView
        viewModel={{
          tone: "medical",
          coverImage: "local-placeholder",
          title: "儿童睡眠量表",
          questionCount: 12,
          estimatedMinutes: 6,
          introTitle: "量表简介",
          introduction: "用于了解近期睡眠情况",
          testees: [{ id: "t1", label: "小明" }],
          selectedTesteeId: "",
          selectedTesteeIndex: -1,
          startLabel: "开始测评",
          startDisabled: true,
        }}
        onSelectTestee={jest.fn()}
        onAddTestee={jest.fn()}
        onStart={jest.fn()}
      />,
    );

    expect(component.root.findByType("taro-image").props.src).toBe("local-placeholder");
    expect(component.root.findByType("taro-button").props.disabled).toBe(true);
  });

  test("forwards selected profile changes", () => {
    const onSelectTestee = jest.fn();
    const component = renderer.create(
      <AssessmentReadyView
        viewModel={{
          tone: "personality",
          coverImage: "cover",
          title: "人格测评",
          questionCount: "--",
          estimatedMinutes: "--",
          introTitle: "测评简介",
          introduction: "认识自己",
          testees: [{ id: "t1", label: "小明" }, { id: "t2", label: "小雨" }],
          selectedTesteeId: "t1",
          selectedTesteeIndex: 0,
          selectedTestee: { name: "小明", gender: "男" },
          startLabel: "开始测评",
          startDisabled: false,
        }}
        onSelectTestee={onSelectTestee}
        onAddTestee={jest.fn()}
        onStart={jest.fn()}
      />,
    );

    component.root.findByType("taro-picker").props.onChange({ detail: { value: 1 } });
    expect(onSelectTestee).toHaveBeenCalledWith("t2");
  });
});

test("long introductions expand without hiding who can fill or blocking the start action", () => {
  const onStart = jest.fn();
  const viewModel = { tone: "medical" as const, coverImage: "cover", title: "量表", questionCount: 20,
    estimatedMinutes: 10, introTitle: "简介", introduction: "原始简介。".repeat(40) + "末尾原文说明",
    writerRolesLabel: "家长 / 教师", testees: [{ id: "t1", label: "成员" }], selectedTesteeId: "t1", selectedTesteeIndex: 0,
    startLabel: "开始测评", startDisabled: false,
  };
  const props = { viewModel, onStart, onSelectTestee: jest.fn(), onAddTestee: jest.fn() };
  let tree!: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<AssessmentReadyView {...props} />); });
  const text = () => JSON.stringify(tree.toJSON());
  const click = (label: string) => act(() => tree.root.findAllByType(ActionButton).find(button => button.props.children === label)!.props.onClick());
  expect(text()).toContain("家长 / 教师");
  expect(text()).not.toContain("末尾原文说明");
  click("查看完整简介");
  expect(text()).toContain(viewModel.introduction);
  click("收起简介");
  expect(text()).not.toContain("末尾原文说明");
  click("开始测评");
  expect(onStart).toHaveBeenCalledTimes(1);
  click("查看完整简介");
  act(() => tree.update(<AssessmentReadyView {...props} viewModel={{ ...viewModel, introduction: "新简介" }} />));
  expect(text()).toContain("新简介");
  expect(text()).not.toContain("收起简介");
  tree.unmount();
});
