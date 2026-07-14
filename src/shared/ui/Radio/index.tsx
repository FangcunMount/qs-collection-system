import React from "react";
import type { ReactNode } from "react";
import { TaroifyRadio } from "../internal/taroify";

export interface RadioGroupProps<T extends string = string> {
  value?: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export interface RadioProps {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export const RadioGroup = <T extends string = string>({
  value,
  onChange,
  disabled = false,
  children,
  className = "",
}: RadioGroupProps<T>) => (
  <TaroifyRadio.Group
    value={value}
    disabled={disabled}
    className={className}
    onChange={(nextValue) => onChange?.(nextValue as T)}
  >
    {children}
  </TaroifyRadio.Group>
);

export const Radio = ({ value, disabled = false, children, className = "" }: RadioProps) => (
  <TaroifyRadio name={value} disabled={disabled} className={className}>
    {children}
  </TaroifyRadio>
);
