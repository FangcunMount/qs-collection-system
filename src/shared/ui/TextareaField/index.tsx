import React from "react";
import { Text, Textarea, View } from "@tarojs/components";
import type { ComponentProps, ReactNode } from "react";

import "../Field/index.less";

type NativeTextareaProps = ComponentProps<typeof Textarea>;

export interface TextareaFieldProps extends Omit<NativeTextareaProps, "className" | "onInput"> {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}

const TextareaField = ({
  label,
  error,
  hint,
  required = false,
  className = "",
  onValueChange,
  ...textareaProps
}: TextareaFieldProps) => (
  <View className={`ql-field ql-field--textarea ${error ? "ql-field--error" : ""} ${className}`.trim()}>
    {label ? (
      <Text className="ql-field__label">
        {label}{required ? <Text className="ql-field__required"> *</Text> : null}
      </Text>
    ) : null}
    <View className="ql-field__control">
      <Textarea
        {...textareaProps}
        onInput={(event) => {
          onValueChange?.(String(event.detail?.value ?? ""));
        }}
      />
    </View>
    {error || hint ? <Text className="ql-field__feedback">{error || hint}</Text> : null}
  </View>
);

export default TextareaField;
