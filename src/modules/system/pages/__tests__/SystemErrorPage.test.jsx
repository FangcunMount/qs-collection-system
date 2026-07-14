import React from "react";
import renderer, { act } from "react-test-renderer";
import Taro from "@tarojs/taro";

import SystemErrorPage from "../SystemErrorPage";

const collectText = (node) => {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  const children = Array.isArray(node.children) ? node.children : [];
  return children.map(collectText).join("");
};

describe("SystemErrorPage shared UI migration", () => {
  afterEach(() => {
    Taro.__setRouterParams({});
    jest.restoreAllMocks();
  });

  test("keeps route query copy and relaunch behavior", () => {
    Taro.__setRouterParams({
      title: "入口已失效",
      text: "当前测评入口无法继续使用",
      desc: "请联系管理员获取新的入口。",
      buttonText: "返回工作台",
      buttonUrl: "/pages/tab/home/index",
    });
    const reLaunch = jest.spyOn(Taro, "reLaunch").mockResolvedValue({});
    let component;

    act(() => {
      component = renderer.create(<SystemErrorPage />);
    });

    expect(collectText(component.toJSON())).toContain(
      "入口已失效当前测评入口无法继续使用请联系管理员获取新的入口。返回工作台"
    );

    component.root.findByType("taro-button").props.onClick();
    expect(reLaunch).toHaveBeenCalledWith({ url: "/pages/tab/home/index" });
  });
});
