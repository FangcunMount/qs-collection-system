import { TaroifyToast } from "../internal/taroify";

export type ToastKind = "text" | "success" | "error" | "loading";

export interface ToastOptions {
  message: string;
  kind?: ToastKind;
  duration?: number;
}

export const Toast = {
  show({ message, kind = "text", duration = 2000 }: ToastOptions) {
    if (kind === "success") return TaroifyToast.success({ message, duration });
    if (kind === "error") return TaroifyToast.fail({ message, duration });
    if (kind === "loading") return TaroifyToast.loading({ message, duration });
    return TaroifyToast.open({ message, duration });
  },
  close() {
    TaroifyToast.close();
  },
};

export default Toast;
