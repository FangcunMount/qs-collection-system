import React from "react";
import renderer, { act } from "react-test-renderer";
import ActionButton from "@/shared/ui/ActionButton";
import BehaviorReportContent from "../BehaviorReportContent";
import BehaviorNormComparisonChart from "../BehaviorNormComparisonChart";
import { buildBehaviorReportViewModel } from "../../../viewModels/behaviorReport";
import * as echarts from "@/pages/assessment/components/ec-canvas/echarts";

jest.mock("@/pages/assessment/components/ec-canvas/echarts", () => ({ init: jest.fn() }));
const textOf = (tree: renderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());

const raw = {
  model: { code: "brief2", title: "测试行为量表" },
  primary_score: { kind: "raw_score", value: 101.25, label: "综合得分" },
  level: { code: "custom", label: "报告指定等级" },
  conclusion: "报告原始结论",
  suggestions: [{ category: "家庭", content: "报告整体建议" }],
  dimensions: [{ factor_code: "gec", factor_name: "综合执行功能", raw_score: 20.123,
    derived_scores: [{ kind: "t_score", value: 75 }, { kind: "standard_score", value: 105 }],
    level: { code: "normal", label: "服务端指定的维度等级" },
    description: "综合维度原始解释", suggestion: "综合维度原始建议",
    norm_reference: { score_kind: "t_score", benchmark: 55, table_version: "norm-version", min_age_months: 60, form_variant: "parent" },
  }, { factor_code: "leaf", factor_name: "普通维度", raw_score: 0, description: "普通维度原始解释" }],
};

test("restored report orders summary, norm chart, dimension cards and advice while preserving actual data", () => {
  const tree = renderer.create(<BehaviorReportContent report={buildBehaviorReportViewModel(raw)} />);
  const content = textOf(tree);
  expect(content.indexOf("报告原始结论")).toBeLessThan(content.indexOf("报告整体建议"));
  expect(content.indexOf("报告原始结论")).toBeLessThan(content.indexOf("综合维度原始解释"));
  expect(content.indexOf("综合维度原始解释")).toBeLessThan(content.indexOf("报告整体建议"));
  expect(content).toContain("综合维度原始建议");
  expect(content).toContain("普通维度原始解释");
  expect(content).toContain("报告指定等级");
  expect(content).toContain("服务端指定的维度等级");
  expect(content).toContain("20.123");
  expect(content).toContain("标准分");
  expect(content).toContain("105");
  expect(content).toContain("60 月龄及以上");
  expect(content).not.toContain("优先支持");
  expect(tree.root.findAllByType(BehaviorNormComparisonChart)).toHaveLength(1);
  expect(tree.root.findByType(BehaviorNormComparisonChart).props.data).toEqual([{ title: "综合执行功能", tScore: 75, benchmark: 55 }]);

  expect(textOf(tree)).toContain("综合维度原始建议");
  tree.unmount();
});

test("missing results do not imply normality or a default norm; suggestions remain available", () => {
  const tree = renderer.create(<BehaviorReportContent report={buildBehaviorReportViewModel({
    suggestions: [{ content: "仅有的建议" }], dimensions: [{ factor_name: "尚无得分", derived_scores: [{ kind: "t_score", value: 0 }] }],
  })} />);
  expect(textOf(tree)).toContain("未提供结果等级");
  expect(textOf(tree)).toContain("未提供总体结论");
  expect(textOf(tree)).toContain("仅有的建议");
  expect(textOf(tree)).not.toContain("常模范围");
  expect(textOf(tree)).not.toContain("常模基准 · T 分 50");
  expect(tree.root.findAllByType(ActionButton)).toHaveLength(0);
  tree.unmount();
});

test("norm comparisons keep each actual benchmark, use independent bars, and release the chart", () => {
  const chart = { setOption: jest.fn(), dispose: jest.fn() };
  (echarts.init as jest.Mock).mockReturnValue(chart);
  const tree = renderer.create(<BehaviorNormComparisonChart data={[
    { title: "完整维度名称", tScore: 0, benchmark: 55 },
    { title: "另一维度", tScore: 72.5, benchmark: 48 },
  ]} />);
  act(() => tree.root.findByType("ec-canvas").props.onInit({ detail: { canvas: { setChart: jest.fn() }, width: 320, height: 180, dpr: 2 } }));
  const option = chart.setOption.mock.calls[0][0];
  expect(option.series.map((series: { type: string; data: number[] }) => ({ type: series.type, data: series.data }))).toEqual([
    { type: "bar", data: [0, 72.5] }, { type: "bar", data: [55, 48] },
  ]);
  expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain("完整维度名称");
  expect(option.animation).toBe(false);
  act(() => tree.unmount());
  expect(chart.dispose).toHaveBeenCalledTimes(1);
});
