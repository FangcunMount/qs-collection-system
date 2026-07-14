import React from "react";
import renderer from "react-test-renderer";
import Taro from "@tarojs/taro";

import {
  ActionButton,
  AppNavigationBar,
  BottomActionBar,
  BottomMenu,
  clearPlanSubscribeStatuses,
  FilterChip,
  getPlanSubscribeScopeKey,
  hasPlanSubscribeHandled,
  listPlanSubscribeStatuses,
  PageShell,
  persistPlanSubscribeStatus,
  requestPrivacyAuthorization,
  SearchBox,
  SectionHeader,
  StatePanel,
  SurfaceCard,
} from "@/shared/ui";

const findByClass = (root, className) => root.find(
  (node) => String(node.props.className || "").split(/\s+/).includes(className)
);

describe("Qlume shared UI", () => {
  test("ActionButton exposes native disabled and loading semantics", () => {
    const disabled = renderer.create(
      <ActionButton disabled block>不可提交</ActionButton>
    ).root.findByType("taro-button");
    const loading = renderer.create(
      <ActionButton loading tone="personality">提交中</ActionButton>
    ).root.findByType("taro-button");

    expect(disabled.props).toMatchObject({ disabled: true, loading: false });
    expect(disabled.props.className).toContain("action-button--block");
    expect(disabled.props.hoverClass).toBe("none");
    expect(loading.props).toMatchObject({ disabled: true, loading: true });
    expect(loading.props.className).toContain("action-button--personality");
  });

  test("SurfaceCard keeps tone and pressed feedback for interactive cards", () => {
    const card = renderer.create(
      <SurfaceCard tone="ability" interactive>
        一段很长但不应被组件截断的卡片内容
      </SurfaceCard>
    ).root.findByType("taro-view");

    expect(card.props.className).toContain("surface-card--ability");
    expect(card.props.className).toContain("surface-card--interactive");
    expect(card.props.hoverClass).toBe("surface-card--pressed");
  });

  test("PageShell reserves safe area and fixed action space", () => {
    const component = renderer.create(
      <PageShell fixedAction={<BottomActionBar>操作</BottomActionBar>}>
        内容
      </PageShell>
    );
    const content = findByClass(component.root, "page-shell__content");

    expect(content.props.className).toContain("page-shell__content--safe-bottom");
    expect(content.props.className).toContain("page-shell__content--with-action");
    expect(findByClass(component.root, "bottom-action-bar").props.className)
      .toContain("bottom-action-bar--elevated");
  });

  test.each(["neutral", "medical", "personality", "ability"])(
    "StatePanel supports the %s domain tone",
    (tone) => {
      const component = renderer.create(
        <StatePanel state="empty" tone={tone} title="暂无结果" />
      );
      expect(findByClass(component.root, "state-panel").props.className)
        .toContain("state-panel--" + tone);
    }
  );

  test("StatePanel renders retry as an enabled native button", () => {
    const onRetry = jest.fn();
    const component = renderer.create(
      <StatePanel
        state="error"
        actionText="重新加载"
        onAction={onRetry}
      />
    );
    const button = component.root.findByType("taro-button");
    button.props.onClick();

    expect(button.props.disabled).toBe(false);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("FilterChip uses selected and disabled states without losing its label", () => {
    const chip = renderer.create(
      <FilterChip selected disabled tone="personality">
        需要展示的长筛选标签
      </FilterChip>
    ).root.findByType("taro-button");

    expect(chip.props.disabled).toBe(true);
    expect(chip.props.className).toContain("filter-chip--selected");
    expect(chip.props.className).toContain("filter-chip--disabled");
  });

  test("SectionHeader action and navigation back remain callable", () => {
    const onAction = jest.fn();
    const onBack = jest.fn();
    const section = renderer.create(
      <SectionHeader title="最新报告" actionLabel="查看全部" onAction={onAction} />
    );
    const navigation = renderer.create(
      <AppNavigationBar title="错误提示" showBack onBack={onBack} />
    );

    findByClass(section.root, "section-header__action").props.onClick();
    findByClass(navigation.root, "app-navigation-bar__back").props.onClick();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("typed BottomMenu keeps existing report navigation behavior", () => {
    const redirectTo = jest.spyOn(Taro, "redirectTo").mockResolvedValue({});
    const menu = renderer.create(<BottomMenu activeKey="首页" />);
    const reportTab = menu.root.findAll(
      (node) => String(node.props.className || "").split(/\s+/).includes("menu-item")
        && typeof node.props.onClick === "function"
    ).find(
      (node) => node.findAll(
        (child) => child.type === "taro-text" && child.children.join("") === "报告"
      ).length > 0
    );
    reportTab.props.onClick();

    expect(redirectTo).toHaveBeenCalledWith({
      url: expect.stringContaining("kind=medical"),
    });
    redirectTo.mockRestore();
  });

  test("typed SearchBox forwards value, disabled state and input callbacks", () => {
    const onInput = jest.fn();
    const component = renderer.create(
      <SearchBox value="睡眠" disabled onInput={onInput} />
    );
    const input = component.root.findByType("taro-input");

    expect(input.props).toMatchObject({
      value: "睡眠",
      disabled: true,
      onInput,
    });
  });

  test("plan subscription scope and persisted status remain compatible", () => {
    clearPlanSubscribeStatuses();
    const scopeKey = getPlanSubscribeScopeKey({
      planName: "春季筛查",
      entryContext: {
        raw: { plan_id: "plan-01", entry_id: "entry-01" },
      },
    });
    persistPlanSubscribeStatus(scopeKey, "accepted", {
      plan_name: "春季筛查",
    });

    expect(scopeKey).toBe("plan:plan-01:entry-01");
    expect(hasPlanSubscribeHandled(scopeKey)).toBe(true);
    expect(listPlanSubscribeStatuses()).toEqual([
      expect.objectContaining({ scope_key: scopeKey, status: "accepted" }),
    ]);
  });

  test("privacy authorization remains a no-op when WeChat privacy APIs are absent", async () => {
    await expect(requestPrivacyAuthorization()).resolves.toBeUndefined();
  });
});
