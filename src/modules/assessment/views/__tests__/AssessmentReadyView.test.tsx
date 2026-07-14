import React from "react";
import renderer from "react-test-renderer";

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
