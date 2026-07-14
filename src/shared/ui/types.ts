import type { ReactNode } from "react";

export type DomainTone = "neutral" | "medical" | "personality" | "ability";

export type ActionVariant = "primary" | "secondary" | "ghost" | "danger";

export interface PageShellProps {
  children: ReactNode;
  navigation?: ReactNode;
  fixedAction?: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: DomainTone;
  scroll?: boolean;
  scrollTop?: number;
  scrollIntoView?: string;
  bottomInset?: boolean;
}

export interface ActionButtonProps {
  children: ReactNode;
  variant?: ActionVariant;
  tone?: DomainTone;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  formType?: "submit" | "reset";
  openType?: string;
  onClick?: (event: unknown) => void;
}

export type StatePanelState = "loading" | "empty" | "error";

export interface StatePanelProps {
  state: StatePanelState;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  tone?: DomainTone;
  compact?: boolean;
  className?: string;
  illustration?: ReactNode;
}
