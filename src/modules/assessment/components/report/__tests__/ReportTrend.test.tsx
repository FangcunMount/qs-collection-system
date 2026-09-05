import React from "react";
import renderer, { act } from "react-test-renderer";
import MedicalReportTrendSummary from "../MedicalReportTrendSummary";
import TrendLineChart from "../TrendLineChart";
import RiskTag from "@/shared/ui/RiskTag";
import StatePanel from "@/shared/ui/StatePanel";
import * as echarts from "@/pages/assessment/components/ec-canvas/echarts";

jest.mock("@/pages/assessment/components/ec-canvas/echarts", () => ({ init: jest.fn() }));
const textOf = (tree: renderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());

test("missing trend data cannot imply zero scores, flat change or normal risk", () => {
  const tree = renderer.create(<MedicalReportTrendSummary assessmentId="a" testeeId="t" loading={false} summary={{
    meta: { comparable_count: 3 }, current: {}, previous: {},
    timeline: [{ total_score: 8 }, {}, { total_score: 0 }],
    factor_changes: [{ factor_code: "f", factor_name: "维度", previous_score: 4 }],
  }} />);
  expect(textOf(tree)).toContain("数据不足，暂无法比较");
  expect(textOf(tree)).toContain("风险信息不足，暂无法比较");
  expect(textOf(tree)).toContain("未提供风险等级");
  expect(textOf(tree)).not.toContain('"正常"');
  expect(textOf(tree)).not.toContain('"持平"');
  expect(tree.root.findByType(TrendLineChart).props.points.map((p: { value: unknown }) => p.value)).toEqual([8, null, 0]);
  tree.unmount();
});

test("factor fallback uses only observed scores and risks; zero remains comparable", () => {
  const tree = renderer.create(<MedicalReportTrendSummary assessmentId="a" testeeId="t" loading={false} summary={{
    meta: { comparable_count: 2 }, current: { total_score: 0, risk_level: "normal" }, previous: { total_score: 4, risk_level: "normal" },
    factor_trends: [{ factor_code: "f", points: [{ score: "4" }, { score: 0 }] }],
  }} />);
  expect(textOf(tree)).toContain("下降 4.0 分");
  expect(textOf(tree)).toContain("等级持平");
  expect(tree.root.findAllByType(RiskTag).map((tag) => tag.props.riskLevel)).toEqual(["normal", "normal", ""]);
  tree.unmount();
});

test("failed trend loading has a retry and does not claim insufficient history", () => {
  const retry = jest.fn();
  const tree = renderer.create(<MedicalReportTrendSummary assessmentId="a" testeeId="t" loading={false} summary={null} error="请求未成功" onRetry={retry} />);
  expect(textOf(tree)).not.toContain("完成 2 次");
  act(() => tree.root.findByType(StatePanel).props.onAction());
  expect(retry).toHaveBeenCalledTimes(1);
  tree.unmount();
});

test("line charts leave gaps for missing values and release canvas resources", () => {
  const chart = { setOption: jest.fn(), dispose: jest.fn() };
  (echarts.init as jest.Mock).mockReturnValue(chart);
  const tree = renderer.create(<TrendLineChart points={[
    { label: "一", value: 2.5 }, { label: "二", value: null }, { label: "三", value: 0 },
  ]} />);
  act(() => tree.root.findByType("ec-canvas").props.onInit({ detail: { canvas: { setChart: jest.fn() }, width: 320, height: 160, dpr: 2 } }));
  const option = chart.setOption.mock.calls[0][0];
  expect(option.series[0]).toMatchObject({ data: [2.5, null, 0], connectNulls: false, smooth: false });
  expect(option.animation).toBe(false);
  act(() => tree.update(<TrendLineChart points={[{ label: "一", value: "" }]} />));
  expect(chart.setOption.mock.calls[chart.setOption.mock.calls.length - 1][0].series).toEqual([]);
  act(() => tree.unmount());
  expect(chart.dispose).toHaveBeenCalledTimes(1);
});

test.each([undefined, null, "", "unrecognized"])("unknown risk %s is neutral", (risk) => {
  const tree = renderer.create(<RiskTag riskLevel={risk} />);
  expect(textOf(tree)).toContain("risk-unknown");
  expect(textOf(tree)).toContain("未提供风险等级");
  tree.unmount();
});
