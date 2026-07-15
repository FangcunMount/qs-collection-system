import React from "react";
import renderer, { act } from "react-test-renderer";

import PersonalityReportHero from "../PersonalityReportHero";

const collectText = (node: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | string | null): string => {
  if (node === null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join("");
  return (node.children || []).map(collectText).join("");
};

describe("PersonalityReportHero", () => {
  test("renders the overview classification and personality name", () => {
    const component = renderer.create(
      <PersonalityReportHero
        modelTitle="16人格测评（基础版）"
        modelExtra={{ type_code: "ESFJ", type_name: "执政官" }}
      />,
    );

    const content = collectText(component.toJSON());
    expect(content).toContain("01总览");
    expect(content).toContain("人格分类16人格测评（基础版）");
    expect(content).toContain("人格名称ESFJ执政官");
  });

  test("renders an optional overview image and hides it after load failure", () => {
    const component = renderer.create(
      <PersonalityReportHero
        modelTitle="16人格测评"
        modelExtra={{ type_code: "INTJ" }}
        imageUrl="https://example.com/intj.png"
      />,
    );

    const image = component.root.findByType("taro-image");
    expect(image.props.src).toBe("https://example.com/intj.png");

    act(() => image.props.onError());

    expect(component.root.findAllByType("taro-image")).toHaveLength(0);
  });

  test("does not reserve an image area when the report has no image", () => {
    const component = renderer.create(
      <PersonalityReportHero modelExtra={{ type_code: "INTJ" }} />,
    );

    expect(component.root.findAllByType("taro-image")).toHaveLength(0);
    expect(JSON.stringify(component.toJSON())).toContain("personality-report-hero--text-only");
  });
});
