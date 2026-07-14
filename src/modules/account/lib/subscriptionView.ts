export type SubscriptionStatus = "accepted" | "ban" | "cancelled" | string;

const STATUS_TEXT: Record<string, string> = {
  accepted: "已同意提醒",
  ban: "已拒绝提醒",
  cancelled: "本次未订阅",
};

export const formatSubscriptionStatus = (status?: SubscriptionStatus): string => (
  STATUS_TEXT[status || ""] || status || "未知"
);

export const formatSubscriptionUpdatedAt = (updatedAt?: number | string): string => {
  if (!updatedAt) return "刚刚更新";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  const part = (value: number) => String(value).padStart(2, "0");
  return `${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`;
};
