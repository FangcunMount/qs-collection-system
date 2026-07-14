import React from "react";
import { View, Text } from "@tarojs/components";
import { ActionButton, BottomSheet as QlBottomSheet } from "@/shared/ui";
import "./BottomSheet.less";

const BottomSheet = ({ isOpened, onClose, title, children, height = "60vh", showConfirm = false, onConfirm }) => {
  return (
    <QlBottomSheet
      open={isOpened}
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
            <ActionButton variant="secondary" className="bottom-sheet-btn" onClick={onClose}>取消</ActionButton>
            <ActionButton className="bottom-sheet-btn" onClick={() => {
              onConfirm && onConfirm();
              onClose();
            }}>
              完成
            </ActionButton>
          </View>
        )}
      </View>
    </QlBottomSheet>
  );
};

export default BottomSheet;
