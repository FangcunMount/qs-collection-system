import { buildUserRegistrationPayload, createInitialUserRegistration, validateUserRegistration } from "../accountRegistration";
import { formatSubscriptionStatus, formatSubscriptionUpdatedAt } from "../subscriptionView";

describe("account presentation flow", () => {
  test("keeps nickname validation and registration payload", () => {
    expect(validateUserRegistration(createInitialUserRegistration())).toBe("请输入昵称");
    expect(buildUserRegistrationPayload({ nickname: " 小明 ", avatar: "avatar" })).toEqual({
      name: "小明", nickname: "小明", avatar: "avatar",
    });
  });

  test("normalizes subscription copy and timestamps", () => {
    expect(formatSubscriptionStatus("accepted")).toBe("已同意提醒");
    expect(formatSubscriptionStatus("custom")).toBe("custom");
    expect(formatSubscriptionUpdatedAt()).toBe("刚刚更新");
    expect(formatSubscriptionUpdatedAt("invalid")).toBe("刚刚更新");
  });
});
