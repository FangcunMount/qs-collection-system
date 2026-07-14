import React from "react";
import { TaroifyRate } from "../internal/taroify";

export interface RateProps {
  value?: number;
  count?: number;
  disabled?: boolean;
  readonly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const Rate = ({ value, count = 5, disabled, readonly, onChange, className = "" }: RateProps) => (
  <TaroifyRate
    value={value}
    count={count}
    disabled={disabled}
    readonly={readonly}
    className={className}
    onChange={onChange}
  />
);

export default Rate;
