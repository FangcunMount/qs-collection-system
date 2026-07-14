import React from "react";
import type { ReactNode } from "react";
import { TaroifyCheckbox } from "../internal/taroify";

export interface CheckboxGroupProps<T extends string = string> {
  value?: T[];
  onChange?: (value: T[]) => void;
  disabled?: boolean;
  max?: number;
  children?: ReactNode;
  className?: string;
}

export interface CheckboxProps {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export const CheckboxGroup = <T extends string = string>({
  value = [],
  onChange,
  disabled = false,
  max,
  children,
  className = "",
}: CheckboxGroupProps<T>) => (
  <TaroifyCheckbox.Group
    value={value}
    disabled={disabled}
    max={max}
    className={className}
    onChange={(nextValue) => onChange?.(nextValue as T[])}
  >
    {children}
  </TaroifyCheckbox.Group>
);

export const Checkbox = ({ value, disabled = false, children, className = "" }: CheckboxProps) => (
  <TaroifyCheckbox name={value} disabled={disabled} className={className}>
    {children}
  </TaroifyCheckbox>
);
