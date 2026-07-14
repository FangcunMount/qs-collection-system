import React, { useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";

import BottomSheet from "../BottomSheet";
import Icon from "../Icon";
import { TaroifyPicker } from "../internal/taroify";
import "./index.less";

export interface PickerOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface PickerFieldProps {
  label?: string;
  value?: string;
  options: PickerOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange?: (value: string, option?: PickerOption) => void;
  className?: string;
}

const PickerField = ({
  label,
  value,
  options,
  placeholder = "请选择",
  disabled = false,
  error,
  onChange,
  className = "",
}: PickerFieldProps) => {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  return (
    <View className={`picker-field ${error ? "picker-field--error" : ""} ${className}`.trim()}>
      {label ? <Text className="picker-field__label">{label}</Text> : null}
      <View
        className={`picker-field__control ${disabled ? "picker-field__control--disabled" : ""}`.trim()}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        <Text className={selected ? "picker-field__value" : "picker-field__placeholder"}>
          {selected?.label || placeholder}
        </Text>
        <Icon name="arrow-right" size={18} />
      </View>
      {error ? <Text className="picker-field__error">{error}</Text> : null}
      <BottomSheet open={open} title={label || placeholder} onClose={() => setOpen(false)}>
        <TaroifyPicker
          value={value}
          columns={options}
          columnsFieldNames={{ label: "label", value: "value" }}
          onConfirm={(nextValue) => {
            const normalized = Array.isArray(nextValue) ? nextValue[0] : nextValue;
            onChange?.(normalized, options.find((option) => option.value === normalized));
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </BottomSheet>
    </View>
  );
};

export default PickerField;
