import React from "react";
import type { ReactNode } from "react";
import { TaroifyPopup } from "../internal/taroify";

export interface PopupProps {
  open: boolean;
  children?: ReactNode;
  placement?: "top" | "right" | "bottom" | "left" | "center";
  rounded?: boolean;
  lockScroll?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  onClose?: () => void;
}

const Popup = ({
  open,
  children,
  placement = "bottom",
  rounded = true,
  lockScroll = true,
  closeOnBackdrop = true,
  className = "",
  onClose,
}: PopupProps) => (
  <TaroifyPopup
    open={open}
    placement={placement}
    rounded={rounded}
    lock={lockScroll}
    className={className}
    onClose={(opened) => {
      if (!opened) onClose?.();
    }}
  >
    <TaroifyPopup.Backdrop open={open} closeable={closeOnBackdrop} />
    {children}
  </TaroifyPopup>
);

export default Popup;
