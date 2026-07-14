import React from "react";
import { TaroifyStepper } from "../internal/taroify";

export interface StepperProps {
  value?: number | string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (value: number | string) => void;
  className?: string;
}

const Stepper = ({ value, min, max, step, disabled, onChange, className = "" }: StepperProps) => (
  <TaroifyStepper
    value={value}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    className={className}
    onChange={onChange}
  />
);

export default Stepper;
