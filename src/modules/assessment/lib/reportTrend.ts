export const getReportDeltaDirection = (delta: number): "flat" | "up" | "down" => {
  if (Math.abs(delta) < 0.01) return "flat";
  return delta > 0 ? "up" : "down";
};

export const formatReportDelta = (delta: number): string => {
  const direction = getReportDeltaDirection(delta);
  if (direction === "flat") return "持平";
  return `${direction === "up" ? "上升" : "下降"} ${Math.abs(delta).toFixed(1)} 分`;
};
