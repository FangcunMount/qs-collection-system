import React from "react";
import renderer from "react-test-renderer";

import type { PersonalityReportViewModel } from "../../../types";
import PersonalityReportContent from "../PersonalityReportContent";

const collectText = (node: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | string | null): string => {
  if (node === null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join("");
  return (node.children || []).map(collectText).join("");
};

const report: PersonalityReportViewModel = {
  tone: "personality",
  modelTitle: "16 型人格测评",
  modelCode: "MBTI",
  testeeName: "小明",
  testeeId: "testee-1",
  createdAt: "2026-07-14T10:00:00Z",
  outcome: {
    code: "INTJ",
    title: "建筑师",
    summary: "独立思考",
    rarityLabel: "",
    percentile: null,
  },
  hero: {
    conclusion: "善于独立思考",
    imageUrl: "",
    modelExtra: { type_code: "INTJ", type_name: "建筑师" },
  },
  sections: [{ key: "strength", title: "优势", content: "系统思考", items: [] }],
  dimensions: [{
    factor_code: "EI",
    title: "能量倾向",
    description: "偏向独处恢复能量",
    score: 7,
    max_score: 10,
    left_pole: "",
    right_pole: "",
    preference: "I",
    strength: 40,
    risk_level: "",
    suggestion: "保留独立空间",
  }],
  suggestions: [
    { category: "general", content: "优势：组织执行" },
    { category: "general", content: "注意：过快定论可能压缩讨论空间" },
    { category: "协作", content: "主动同步思路" },
  ],
  hasContent: true,
};

describe("PersonalityReportContent", () => {
  test("shows the four report regions in order", () => {
    const content = collectText(renderer.create(
      <PersonalityReportContent report={report} />,
    ).toJSON());

    expect(content).toContain("01总览");
    expect(content).toContain("人格分类16 型人格测评");
    expect(content).toContain("02维度观察");
    expect(content).toContain("EI能量倾向偏向 I · 70%");
    expect(content).toContain("E外向");
    expect(content).toContain("I内向");
    expect(content).toContain("能量倾向");
    expect(content).toContain("03人格报告");
    expect(content).toContain("系统思考");
    expect(content).toContain("04成长建议");
    expect(content).not.toContain("general");
    expect(content).toContain("可以发挥");
    expect(content).toContain("组织执行");
    expect(content).toContain("需要留意");
    expect(content).toContain("过快定论可能压缩讨论空间");
    expect(content).toContain("可以尝试");
    expect(content).toContain("协作主动同步思路");
    expect(content).toContain("能量倾向保留独立空间");
  });
});
