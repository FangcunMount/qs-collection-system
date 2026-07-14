import {
  buildTesteeRegistrationPayload,
  calculateTesteeAge,
  createInitialTesteeForm,
  formatTesteeGender,
  formatTesteeIdType,
  formatTesteeRelation,
  validateTesteeForm,
} from "../testeeForm";

describe("testee form flow", () => {
  test("locks field validation order and registration payload", () => {
    const initial = createInitialTesteeForm();
    expect(validateTesteeForm(initial)).toBe("请填写档案的姓名");
    expect(validateTesteeForm({ ...initial, legalName: "小明" })).toBe("请选择档案的性别");
    expect(buildTesteeRegistrationPayload({ legalName: " 小明 ", gender: 1, dob: "2020-01-02", relation: "parent" }))
      .toMatchObject({ name: "小明", birthday: "2020-01-02", gender: 1, relation: "parent", source: "online_form" });
  });

  test("keeps card labels and age calculation", () => {
    expect(formatTesteeGender("2")).toBe("女");
    expect(formatTesteeRelation("guardian")).toBe("监护人");
    expect(formatTesteeIdType("birth_cert")).toBe("出生证明");
    expect(calculateTesteeAge("2020-07-15", new Date("2026-07-14T00:00:00"))).toBe("5岁");
  });
});
