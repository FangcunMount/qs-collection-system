import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import Taro from "@tarojs/taro";
import { ROUTES, routes } from "../../config/routes";
import { ASSESSMENT_KIND } from "../../lib/assessmentKind";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "../../lib/entryScan";
import "./index.less";

const bottomMenu = [
  { label: "首页", icon: "home", url: ROUTES.tabHome },
  { label: "量表", icon: "list", url: ROUTES.tabScales },
  {
    label: "报告",
    icon: "file-generic",
    url: routes.assessmentRecords({ kind: ASSESSMENT_KIND.MEDICAL }),
  },
  { label: "我的", icon: "user", url: ROUTES.tabMe },
];

const CENTER_INSERT_AFTER_INDEX = 1;

const BottomMenu = ({ activeKey }) => {
  const handleMenuClick = (item) => {
    if (!item.url) {
      return;
    }

    const currentPath = Taro.getCurrentInstance().router.path;
    const targetPath = item.url.split("?")[0];
    if (currentPath !== targetPath) {
      Taro.redirectTo({ url: item.url });
    }
  };

  const handleScan = async () => {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ["qrCode"] });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({ title: "未识别到可用测评入口", icon: "none" });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (error) {
      if (isScanCancelError(error)) {
        return;
      }
      console.error("[BottomMenu] 扫码失败:", error);
      Taro.showToast({ title: "扫码失败，请重试", icon: "none" });
    }
  };

  const renderTab = (item) => {
    const isActive = item.label === activeKey;
    return (
      <View
        key={item.label}
        className={`menu-item ${isActive ? "active" : ""}`}
        onClick={() => handleMenuClick(item)}
      >
        <View className="menu-item__icon-wrap">
          <AtIcon
            value={item.icon}
            size="24"
            color={isActive ? "#2F80ED" : "#8A96AA"}
            className="menu-item__icon"
          />
        </View>
        <Text className="menu-item__label">{item.label}</Text>
      </View>
    );
  };

  return (
    <View className="bottom-menu">
      {bottomMenu.map((item, index) => {
        if (index === CENTER_INSERT_AFTER_INDEX) {
          return (
            <React.Fragment key={item.label}>
              {renderTab(item)}
              <View className="menu-item menu-item--center" onClick={handleScan}>
                <View className="menu-item__cta">
                  <View className="menu-item__qr">
                    <View className="menu-item__qr-corner menu-item__qr-corner--tl" />
                    <View className="menu-item__qr-corner menu-item__qr-corner--tr" />
                    <View className="menu-item__qr-corner menu-item__qr-corner--bl" />
                    <View className="menu-item__qr-corner menu-item__qr-corner--br" />
                    <View className="menu-item__qr-line" />
                  </View>
                </View>
                <Text className="menu-item__label menu-item__label--center">扫一扫</Text>
              </View>
            </React.Fragment>
          );
        }
        return renderTab(item);
      })}
    </View>
  );
};

export default BottomMenu;
