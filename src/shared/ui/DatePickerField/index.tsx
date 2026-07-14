import React, { useState } from "react";
import { Text, View } from "@tarojs/components";

import BottomSheet from "../BottomSheet";
import Icon from "../Icon";
import { TaroifyDatetimePicker } from "../internal/taroify";
import "../PickerField/index.less";

export interface DatePickerFieldProps {
  label?: string;
  value?: Date;
  min?: Date;
  max?: Date;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  formatValue?: (date: Date) => string;
  onChange?: (date: Date) => void;
  className?: string;
}

const defaultFormat = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const DatePickerField = ({
  label,
  value,
  min,
  max,
  placeholder = "请选择日期",
  disabled = false,
  error,
  formatValue = defaultFormat,
  onChange,
  className = "",
}: DatePickerFieldProps) => {
  const [open, setOpen] = useState(false);

  return (
    <View className={`picker-field ${error ? "picker-field--error" : ""} ${className}`.trim()}>
      {label ? <Text className="picker-field__label">{label}</Text> : null}
      <View
        className={`picker-field__control ${disabled ? "picker-field__control--disabled" : ""}`.trim()}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        <Text className={value ? "picker-field__value" : "picker-field__placeholder"}>
          {value ? formatValue(value) : placeholder}
        </Text>
        <Icon name="arrow-right" size={18} />
      </View>
      {error ? <Text className="picker-field__error">{error}</Text> : null}
      <BottomSheet open={open} title={label || placeholder} onClose={() => setOpen(false)}>
        <TaroifyDatetimePicker
          type="date"
          value={value || new Date()}
          min={min}
          max={max}
          onConfirm={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </BottomSheet>
    </View>
  );
};

export default DatePickerField;
