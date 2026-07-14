import React from "react";
import { Text, View } from "@tarojs/components";

import type { DomainTone } from "../types";
import "./index.less";

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  tone?: DomainTone;
  className?: string;
}

const FormField = ({
  label,
  children,
  required = false,
  hint = "",
  error = "",
  tone = "medical",
  className = "",
}: FormFieldProps) => (
  <View className={["form-field", `form-field--${tone}`, error ? "form-field--error" : "", className].filter(Boolean).join(" ")}>
    <View className="form-field__label-row">
      <Text className="form-field__label">{label}</Text>
      {required ? <Text className="form-field__required">*</Text> : null}
    </View>
    <View className="form-field__control">{children}</View>
    {error ? <Text className="form-field__message form-field__message--error">{error}</Text> : null}
    {!error && hint ? <Text className="form-field__message">{hint}</Text> : null}
  </View>
);

export default FormField;
