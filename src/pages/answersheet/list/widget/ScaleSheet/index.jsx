import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";
import BottomSheet from "../BottomSheet";
import "./index.less";

/**
 * 量表选择弹层组件
 */
const ScaleSheet = ({
  scaleList = [],
  selectedScaleCode = '',
  onSelectScale,
  showScaleSheet = false,
  onClose
}) => {
  const handleSelectScale = (scaleCode) => {
    onSelectScale && onSelectScale(scaleCode);
    onClose && onClose();
  };

  return (
    <BottomSheet
      isOpened={showScaleSheet}
      onClose={() => {
        onClose && onClose();
      }}
      title="选择量表"
      height="70vh"
    >
      <View className="scale-sheet-content">
        {/* 量表列表 */}
        <View className="scale-sheet-section">
          <View className="scale-sheet-list">
            {scaleList.length > 0 ? (
              scaleList.map((scale) => {
                const isSelected = selectedScaleCode === scale.code;
                return (
                  <View
                    key={scale.code}
                    className={`scale-sheet-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectScale(scale.code)}
                  >
                    <Text className="scale-sheet-item-name">{scale.name}</Text>
                    {isSelected && (
                      <AtIcon value="check" size="20" color="#1890FF" />
                    )}
                  </View>
                );
              })
            ) : (
              <View className="scale-sheet-empty">
                <Text className="scale-sheet-empty-text">暂无量表</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ScaleSheet;

