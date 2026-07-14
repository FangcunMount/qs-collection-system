import React from "react";
import renderer from "react-test-renderer";
import Taro from "@tarojs/taro";

import AssessmentRecordCard from "../AssessmentRecordCard";
import AssessmentRecordList from "../AssessmentRecordList";
import type { AssessmentRecordViewModel } from "../../../types";

const collectText = (node: renderer.ReactTestRendererJSON | string | null): string => {
  if (node == null) return "";
  if (typeof node === "string") return node;
  return (node.children || []).map((child) => collectText(child as renderer.ReactTestRendererJSON | string)).join("");
};

const medicalRecord: AssessmentRecordViewModel = {
  id: "assessment-1",
  answerSheetId: "answer-1",
  title: "儿童焦虑量表",
  description: "SCARED",
  createdAt: "2026-07-14 10:00:00",
  status: "abnormal",
  sourceStatus: "evaluated",
  score: 18,
  riskLevel: "high",
  assessmentKind: "medical",
  tone: "medical",
  reportReadable: true,
  showTrendAction: true,
  scaleCode: "SCARED",
  scaleName: "儿童焦虑量表",
};

const baseListProps = {
  tone: "medical" as const,
  testeeId: "testee-1",
  records: [] as AssessmentRecordViewModel[],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  loading: false,
  loadingMore: false,
  error: "",
  emptyText: "完成测评后将在这里展示",
  onRetry: jest.fn(),
  onLoadMore: jest.fn(),
  onEmptyAction: jest.fn(),
};

describe("assessment record presentation", () => {
  test("renders initial, empty and error states through StatePanel", () => {
    const loading = renderer.create(<AssessmentRecordList {...baseListProps} loading />).toJSON();
    const empty = renderer.create(<AssessmentRecordList {...baseListProps} />).toJSON();
    const error = renderer.create(<AssessmentRecordList {...baseListProps} error="网络不可用" />).toJSON();

    expect(collectText(loading)).toContain("正在加载测评记录");
    expect(collectText(empty)).toContain("完成测评后将在这里展示");
    expect(collectText(error)).toContain("网络不可用");
  });

  test("keeps response, medical trend and medical report routes", () => {
    const navigateTo = jest.spyOn(Taro, "navigateTo").mockResolvedValue({});
    const component = renderer.create(<AssessmentRecordCard record={medicalRecord} testeeId="testee-1" />);
    const buttons = component.root.findAllByType("taro-button");
    const findButton = (label: string) => buttons.find((button) => button.findAllByType("taro-text")
      .some((textNode) => textNode.children.join("") === label));

    findButton("查看详情")?.props.onClick();
    findButton("查看趋势")?.props.onClick();
    findButton("查看报告")?.props.onClick();

    expect(navigateTo).toHaveBeenNthCalledWith(1, { url: expect.stringContaining("a=answer-1") });
    expect(navigateTo).toHaveBeenNthCalledWith(2, { url: expect.stringContaining("aid=assessment-1") });
    expect(navigateTo).toHaveBeenNthCalledWith(3, { url: expect.stringContaining("aid=assessment-1") });
    navigateTo.mockRestore();
  });

  test("does not expose trend action for personality records", () => {
    const tree = renderer.create(
      <AssessmentRecordCard
        record={{ ...medicalRecord, assessmentKind: "personality", tone: "personality", showTrendAction: false }}
        testeeId="testee-1"
      />,
    ).toJSON();

    expect(collectText(tree)).not.toContain("查看趋势");
    expect(collectText(tree)).toContain("查看报告");
  });
});
