import React from "react";
import renderer from "react-test-renderer";

import ReportPageShell from "../ReportPageShell";

const collectText = (node: renderer.ReactTestRendererJSON | string | null): string => {
  if (node == null) return "";
  if (typeof node === "string") return node;
  return (node.children || [])
    .map((child) => collectText(child as renderer.ReactTestRendererJSON | string))
    .join("");
};

describe("report page shell", () => {
  test("renders shared loading and retryable error states", () => {
    const retry = jest.fn();
    const loading = renderer.create(
      <ReportPageShell tone="medical" loading>报告内容</ReportPageShell>,
    ).toJSON();
    const error = renderer.create(
      <ReportPageShell tone="personality" error="网络不可用" onRetry={retry} />,
    );

    expect(collectText(loading)).toContain("正在加载测评报告");
    expect(collectText(error.toJSON())).toContain("网络不可用");
    const retryButton = error.root.findAllByType("taro-button")
      .find((button) => button.findAllByType("taro-text")
        .some((textNode) => textNode.children.join("") === "重新加载"));
    retryButton?.props.onClick();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("keeps domain tone and fixed report action", () => {
    const tree = renderer.create(
      <ReportPageShell
        tone="personality"
        fixedAction={<span>完成操作</span>}
      >
        <span>人格报告</span>
      </ReportPageShell>,
    ).toJSON();

    expect(collectText(tree)).toContain("人格报告");
    expect(collectText(tree)).toContain("完成操作");
    expect(JSON.stringify(tree)).toContain("page-shell--personality");
  });
});
