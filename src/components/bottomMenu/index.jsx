import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import Taro from "@tarojs/taro";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "../../util/entryScan";
import "./index.less";

const bottomMenu = [
  { label: "首页", icon: "home", url: "/pages/home/index/index" },
  { label: "发现", icon: "search", url: "/pages/questionnaire/list/index" },
  { label: "扫码测评", icon: "camera", action: "scan" },
  { label: "记录", icon: "clock", url: "/pages/answersheet/list/index" },
  { label: "我的", icon: "user", url: "/pages/user/profile/index" }
];

const BottomMenu = ({ activeKey }) => {
  const handleMenuClick = async (item) => {
    if (item.action === "scan") {
      try {
        const result = await Taro.scanCode({
          onlyFromCamera: false,
          scanType: ["qrCode"]
        });
        const targetUrl = buildAssessmentScanTargetUrl(result);
        if (!targetUrl) {
          Taro.showToast({
            title: "未识别到可用测评入口",
            icon: "none"
          });
          return;
        }
        Taro.navigateTo({ url: targetUrl });
      } catch (error) {
        if (isScanCancelError(error)) {
          return;
        }
        console.error("[BottomMenu] 扫码测评失败:", error);
        Taro.showToast({
          title: "扫码失败，请重试",
          icon: "none"
        });
      }
      return;
    }

    if (item.url) {
      const currentPath = Taro.getCurrentInstance().router.path;
      if (currentPath !== item.url) {
        Taro.redirectTo({ url: item.url });
      }
    }
  };

  return (
    <View className="bottom-menu">
      {bottomMenu.map((item) => (
        <View 
          key={item.label}
          className={`menu-item ${item.label === activeKey ? 'active' : ''} ${item.action === 'scan' ? 'menu-item--scan' : ''}`}
          onClick={() => handleMenuClick(item)}
        >
          {item.action === "scan" ? (
            <>
              <View className="menu-item__scan-button">
                <AtIcon
                  value={item.icon}
                  size="28"
                  color="#FFFFFF"
                  className="menu-item__icon"
                />
              </View>
              <Text className="menu-item__label menu-item__label--scan">{item.label}</Text>
            </>
          ) : (
            <>
              <AtIcon 
                value={item.icon} 
                size="24" 
                color={item.label === activeKey ? "#1890FF" : "#595959"}
                className="menu-item__icon" 
              />
              <Text className="menu-item__label">{item.label}</Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
};

export default BottomMenu;
