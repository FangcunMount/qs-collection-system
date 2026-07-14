import React from "react";
import type { ReactNode } from "react";
import { TaroifyDialog } from "../internal/taroify";

export interface DialogProps {
  open: boolean;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  closeOnBackdrop?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  className?: string;
}

const Dialog = ({
  open,
  title,
  children,
  footer,
  confirmText = "确定",
  cancelText = "取消",
  showCancel = true,
  closeOnBackdrop = false,
  onConfirm,
  onCancel,
  onClose,
  className = "",
}: DialogProps) => {
  const closeHandler = (opened: boolean) => {
    if (!opened) onClose?.();
  };

  if (footer) {
    return (
      <TaroifyDialog
        open={open}
        backdrop={{ closeable: closeOnBackdrop }}
        className={className}
        onClose={closeHandler}
      >
        {title ? <TaroifyDialog.Header>{title}</TaroifyDialog.Header> : null}
        <TaroifyDialog.Content>{children}</TaroifyDialog.Content>
        <TaroifyDialog.Actions>{footer}</TaroifyDialog.Actions>
      </TaroifyDialog>
    );
  }

  return (
    <TaroifyDialog
      open={open}
      title={title}
      message={children}
      confirm={confirmText}
      cancel={showCancel ? cancelText : undefined}
      backdrop={{ closeable: closeOnBackdrop }}
      className={className}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={closeHandler}
    />
  );
};

export default Dialog;
