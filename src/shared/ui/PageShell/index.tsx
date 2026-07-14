import React from "react";
import { ScrollView, View } from "@tarojs/components";

import type { PageShellProps } from "../types";
import "./index.less";

const PageShell = ({
  children,
  navigation,
  fixedAction,
  className = "",
  contentClassName = "",
  tone = "neutral",
  scroll = true,
  scrollTop,
  scrollIntoView,
  bottomInset = true,
}: PageShellProps) => {
  const contentClasses = [
    "page-shell__content",
    fixedAction ? "page-shell__content--with-action" : "",
    bottomInset ? "page-shell__content--safe-bottom" : "",
    contentClassName,
  ].filter(Boolean).join(" ");

  return (
    <View className={`page-shell page-shell--${tone} ${className}`.trim()}>
      {navigation}
      {scroll ? (
        <ScrollView
          scrollY
          scrollTop={scrollTop}
          scrollIntoView={scrollIntoView}
          scrollWithAnimation
          enhanced
          showScrollbar={false}
          className={contentClasses}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={contentClasses}>{children}</View>
      )}
      {fixedAction ? (
        <View className="page-shell__fixed-action">{fixedAction}</View>
      ) : null}
    </View>
  );
};

export default PageShell;
