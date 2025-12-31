import React from "react";
import { View, Text } from "@tarojs/components";
import { AtFloatLayout } from "taro-ui";
import "taro-ui/dist/style/components/float-layout.scss";
import "./BottomSheet.less";

const BottomSheet = ({ isOpened, onClose, title, children, height = "60vh", showConfirm = false, onConfirm }) => {
  return (
    <AtFloatLayout
      isOpened={isOpened}
      title={title}
      onClose={onClose}
      className="bottom-sheet-float-layout"
    >
      <View className="bottom-sheet-container">
        {/* 内容 */}
        <View className="bottom-sheet-content">
          {children}
        </View>

        {/* 确认按钮 */}
        {showConfirm && (
          <View className="bottom-sheet-footer">
            <View className="bottom-sheet-btn bottom-sheet-btn-cancel" onClick={onClose}>
              <Text className="bottom-sheet-btn-text">取消</Text>
            </View>
            <View className="bottom-sheet-btn bottom-sheet-btn-confirm" onClick={() => {
              onConfirm && onConfirm();
              onClose();
            }}>
              <Text className="bottom-sheet-btn-text">完成</Text>
            </View>
          </View>
        )}
      </View>
    </AtFloatLayout>
  );
};

export default BottomSheet;

