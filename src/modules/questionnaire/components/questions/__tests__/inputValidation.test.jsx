import React from "react";
import { act, create } from "react-test-renderer";
import Textarea from "../textarea";
import TextQuestion from "../text";
import NumberQuestion from "../number";
import { validateQuestion } from "../../../lib/questionnaireFlow";
import { Field, Stepper, TextareaField } from "@/shared/ui";

let tree;
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; });
const textarea = (rules, value = "") => ({ code: "text", type: "Textarea", title: "说明", value, validation_rules: rules });
const renderTextarea = (rules, onChangeValue = jest.fn()) => {
  act(() => { tree = create(<Textarea item={textarea(rules)} index={3} onChangeValue={onChangeValue} />); });
  return onChangeValue;
};

test("the real textarea preserves the answer and applies max_length at Unicode validation boundaries", () => {
  const changed = renderTextarea([{ rule_type: "max_length", target_value: "2" }]);
  expect(tree.root.findByType(TextareaField).props.maxlength).toBe(-1);
  act(() => tree.root.findByType(TextareaField).props.onValueChange("中🙂末"));
  expect(changed).toHaveBeenCalledWith("中🙂末", 3);
  expect(validateQuestion(textarea([{ rule_type: "max_length", target_value: "2" }], "中🙂末")).valid).toBe(false);
  act(() => tree.root.findByType(TextareaField).props.onValueChange("中🙂"));
  expect(changed).toHaveBeenLastCalledWith("中🙂", 3);
  expect(validateQuestion(textarea([{ rule_type: "max_length", target_value: "2" }], "中🙂")).valid).toBe(true);
});

test.each([0, "0"])("the real textarea honors max_length=%s", (zero) => {
  const changed = renderTextarea([{ rule_type: "max_length", target_value: zero }]);
  act(() => tree.root.findByType(TextareaField).props.onValueChange("中文"));
  expect(tree.root.findByType(TextareaField).props.maxlength).toBe(-1);
  expect(changed).toHaveBeenCalledWith("中文", 3);
  expect(validateQuestion(textarea([{ rule_type: "max_length", target_value: zero }], "中文")).valid).toBe(false);
});

test("an unconstrained textarea preserves its existing 3000-character input cap", () => {
  const changed = renderTextarea([]);
  expect(tree.root.findByType(TextareaField).props.maxlength).toBe(3000);
  act(() => tree.root.findByType(TextareaField).props.onValueChange("中".repeat(3000)));
  expect(changed.mock.calls[0][0]).toHaveLength(3000);
});

test.each([0, "0"])("the real numeric control passes zero bounds to the stepper", (zero) => {
  act(() => { tree = create(<NumberQuestion item={{ code: "n", type: "Number", value: 0, validation_rules: [
    { rule_type: "min_value", target_value: zero }, { rule_type: "max_value", target_value: zero },
  ] }} onChangeValue={jest.fn()} />); });
  expect(tree.root.findByType(Stepper).props).toMatchObject({ min: 0, max: 0 });
});


test("the real text input leaves character bounds to the canonical validator without native truncation", () => {
  const changed = jest.fn();
  act(() => { tree = create(<TextQuestion item={{ ...textarea([{ rule_type: "max_length", target_value: "2" }]), type: "Text" }} onChangeValue={changed} />); });
  const field = tree.root.findByType(Field);
  expect(field.props.maxlength).toBe(-1);
  act(() => field.props.onValueChange("中🙂"));
  expect(changed).toHaveBeenCalledWith("中🙂", undefined);
});
