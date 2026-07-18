import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("../FactorBarChart", () => ({ __esModule: true, default: () => null }));
jest.mock("../FactorScatterChart", () => ({ __esModule: true, default: () => null }));
jest.mock("../RadarChart", () => ({
  __esModule: true,
  default: () => {
    const ReactRuntime = require("react");
    return ReactRuntime.createElement("taro-view", { id: "radar" });
  },
}));

import MedicalReportContent from "../MedicalReportContent";

const hasClass = (node: renderer.ReactTestInstance, className: string): boolean => (
  String(node.props.className || "").split(/\s+/).includes(className)
);

describe("MedicalReportContent", () => {
  test("renders the radar chart by default", () => {
    const component = renderer.create(
      <MedicalReportContent factors={[{
        factorCode: "attention",
        title: "注意缺陷",
        score: 4,
        maxScore: 9,
        riskLevel: "normal",
        content: "因子解读",
        suggestion: "详细建议内容",
      }]} />,
    );

    expect(component.root.findByProps({ id: "radar" })).toBeTruthy();
  });

  test("renders the report sections as an equal-width tab switch", () => {
    const component = renderer.create(
      <MedicalReportContent factors={[{
        factorCode: "attention",
        title: "注意缺陷",
        score: 4,
        maxScore: 9,
        riskLevel: "normal",
        content: "因子解读",
        suggestion: "详细建议内容",
      }]} />,
    );
    const tabs = component.root.findAllByType("taro-button")
      .filter((node) => hasClass(node, "report-section-tab"));

    expect(tabs).toHaveLength(2);
    expect(hasClass(tabs[0], "report-section-tab--active")).toBe(true);
    expect(hasClass(tabs[1], "report-section-tab--active")).toBe(false);

    act(() => tabs[1].props.onClick());

    expect(hasClass(tabs[0], "report-section-tab--active")).toBe(false);
    expect(hasClass(tabs[1], "report-section-tab--active")).toBe(true);
    expect(component.root.findAllByType("taro-view")
      .filter((node) => hasClass(node, "factor-card"))).toHaveLength(1);
  });
});
