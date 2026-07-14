import React from "react";
import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";

import Popup from "../Popup";
import Icon from "../Icon";
import "./index.less";

export interface BottomSheetProps {
  open: boolean;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const BottomSheet = ({ open, title, children, onClose, className = "" }: BottomSheetProps) => (
  <Popup open={open} onClose={onClose} className={`bottom-sheet ${className}`.trim()}>
    <View className="bottom-sheet__safe">
      <View className="bottom-sheet__handle" />
      {(title || onClose) ? (
        <View className="bottom-sheet__header">
          <Text className="bottom-sheet__title">{title}</Text>
          <View className="bottom-sheet__close" onClick={onClose}>
            <Icon name="close" size={20} />
          </View>
        </View>
      ) : null}
      <View className="bottom-sheet__content">{children}</View>
    </View>
  </Popup>
);

export default BottomSheet;
