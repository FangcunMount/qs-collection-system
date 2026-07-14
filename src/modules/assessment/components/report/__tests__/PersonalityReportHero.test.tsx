import React from "react";
import renderer from "react-test-renderer";

import PersonalityReportHero from "../PersonalityReportHero";

const collectText = (node: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | string | null): string => {
  if (node === null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join("");
  return (node.children || []).map(collectText).join("");
};

describe("PersonalityReportHero", () => {
  test("does not repeat an identity-only conclusion in the hero copy", () => {
    const component = renderer.create(
      <PersonalityReportHero
        modelTitle="16人格测评（基础版）"
        modelExtra={{ type_code: "ESFJ", type_name: "执政官" }}
        conclusion="ESFJ 执政官"
      />,
    );

    expect(collectText(component.toJSON())).toBe("16人格测评（基础版）ESFJ执政官");
  });
});
