import React from "react";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "@tarojs/components";

import { TaroifyInput } from "../internal/taroify";
import "./index.less";

type NativeInputProps = ComponentProps<typeof TaroifyInput>;

export interface FieldProps extends Omit<NativeInputProps, "className"> {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}

const Field = ({ label, error, hint, required = false, className = "", onValueChange, onChange, ...inputProps }: FieldProps) => (
  <View className={`ql-field ${error ? "ql-field--error" : ""} ${className}`.trim()}>
    {label ? (
      <Text className="ql-field__label">
        {label}{required ? <Text className="ql-field__required"> *</Text> : null}
      </Text>
    ) : null}
    <View className="ql-field__control">
      <TaroifyInput
        {...inputProps}
        onChange={(event) => {
          onChange?.(event);
          onValueChange?.(String(event.detail?.value ?? ""));
        }}
      />
    </View>
    {error || hint ? <Text className="ql-field__feedback">{error || hint}</Text> : null}
  </View>
);

export default Field;
