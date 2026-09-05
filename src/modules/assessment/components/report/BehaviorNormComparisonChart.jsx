import useNativeEChart from "./useNativeEChart";
import React, { useMemo } from "react";
import { View } from "@tarojs/components";


const shortLabel = (value = "") => value.length > 6 ? `${value.slice(0, 6)}…` : value;

const BehaviorNormComparisonChart = ({ data = [] }) => {
  const points = useMemo(() => data.filter((item) => (
    Number.isFinite(item.tScore) && Number.isFinite(item.benchmark)
  )), [data]);

  const option = useMemo(() => {
    const measured = points.map((item) => item.tScore);
    const benchmark = points.map((item) => item.benchmark);

    return {
      animation: false,
      legend: { data: ["本次 T 分", "常模基准"], top: 0, selectedMode: false },
      grid: { left: 8, right: 28, top: 42, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#AEE5D9",
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: "#071735", fontSize: 12 },
        formatter: (params) => {
          const index = params?.[0]?.dataIndex;
          const item = points[index];
          if (!item) return "";
          return `${item.title}<br/>本次 T 分：${item.tScore}<br/>常模基准：${item.benchmark}`;
        },
      },
      xAxis: {
        type: "value",
        name: "T 分",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#66738E", fontSize: 11 },
        splitLine: { lineStyle: { color: "#E8F0F7", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: points.map((item) => item.title),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#53627A", fontSize: 11, interval: 0, formatter: shortLabel },
      },
      series: [
        { name: "本次 T 分", type: "bar", data: measured, barMaxWidth: 16,
          itemStyle: { color: "#18A999" }, label: { show: true, position: "right", fontSize: 11 } },
        { name: "常模基准", type: "bar", data: benchmark, barMaxWidth: 16,
          itemStyle: { color: "#8B7CF6" }, label: { show: true, position: "right", fontSize: 11 } },
      ],
    };
  }, [points]);

  const { ec, onInit } = useNativeEChart(option);

  return (
    <View className="behavior-norm-chart" style={{ height: `${Math.max(360, points.length * 96 + 120)}rpx` }}>
      <ec-canvas
        id="behavior-norm-comparison"
        canvasId="behavior-norm-comparison"
        ec={ec}
        onInit={onInit}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default BehaviorNormComparisonChart;
