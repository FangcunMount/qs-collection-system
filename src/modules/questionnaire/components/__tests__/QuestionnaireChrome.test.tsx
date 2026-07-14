import React from "react";
import renderer from "react-test-renderer";

import QuestionnaireBottomActions from "../QuestionnaireBottomActions";
import QuestionnaireProgress from "../QuestionnaireProgress";

describe("questionnaire chrome", () => {
  test("progress exposes the current and total question without truncation", () => {
    const component = renderer.create(
      <QuestionnaireProgress current={12} total={48} percentage={25} />,
    );
    const text = component.root.findAllByType("taro-text")
      .map((node) => node.children.join(""))
      .join("");
    const value = component.root.findByProps({ className: "questionnaire-progress__value" });

    expect(text).toBe("12/48");
    expect(value.props.style).toEqual({ width: "25%" });
  });

  test("bottom actions keep native disabled and loading semantics", () => {
    const component = renderer.create(
      <QuestionnaireBottomActions
        tone="personality"
        showPrevious
        previousDisabled
        showSubmit
        submitting
      />,
    );
    const buttons = component.root.findAllByType("taro-button");

    expect(buttons).toHaveLength(2);
    expect(buttons[0].props).toMatchObject({ disabled: true, loading: false });
    expect(buttons[1].props).toMatchObject({ disabled: true, loading: true });
    expect(buttons[1].props.className).toContain("action-button--personality");
  });
});
