import React, { useEffect, useMemo, useRef } from "react";
import { View } from "@tarojs/components";

import * as echarts from "@/pages/assessment/components/ec-canvas/echarts";

const shortLabel = (value = "") => value.length > 6 ? `${value.slice(0, 6)}…` : value;

const BehaviorNormComparisonChart = ({ data = [] }) => {
  const chartRef = useRef(null);
  const points = useMemo(() => data.filter((item) => (
    Number.isFinite(item.tScore) && Number.isFinite(item.benchmark)
  )), [data]);

  const option = useMemo(() => {
    const measured = points.map((item) => item.tScore);
    const benchmark = points.map((item) => item.benchmark);
    const allValues = [...measured, ...benchmark];
    const minValue = allValues.length ? Math.min(...allValues) : 20;
    const maxValue = allValues.length ? Math.max(...allValues) : 80;
    const yMin = Math.min(30, Math.floor((minValue - 5) / 10) * 10);
    const yMax = Math.max(80, Math.ceil((maxValue + 5) / 10) * 10);

    return {
      animationDuration: 500,
      grid: { left: 18, right: 22, top: 28, bottom: 40, containLabel: true },
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
        type: "category",
        boundaryGap: false,
        data: points.map((item) => item.title),
        axisLine: { lineStyle: { color: "#DDE8F6" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#66738E",
          fontSize: 10,
          interval: 0,
          formatter: shortLabel,
        },
      },
      yAxis: {
        type: "value",
        min: yMin,
        max: yMax,
        interval: 10,
        name: "T 分",
        nameTextStyle: { color: "#8A96AA", fontSize: 10, padding: [0, 0, 0, -8] },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#8A96AA", fontSize: 10 },
        splitLine: { lineStyle: { color: "#E8F0F7", type: "dashed" } },
      },
      series: [
        {
          name: "本次 T 分",
          type: "line",
          data: measured,
          smooth: 0.28,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3, color: "#18A999" },
          itemStyle: { color: "#18A999", borderColor: "#FFFFFF", borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(24, 169, 153, 0.16)" },
              { offset: 1, color: "rgba(24, 169, 153, 0.01)" },
            ]),
          },
          label: {
            show: true,
            position: "top",
            color: "#168C80",
            fontSize: 10,
          },
        },
        {
          name: "常模基准",
          type: "line",
          data: benchmark,
          symbol: "none",
          lineStyle: { width: 2, color: "#8B7CF6", type: "dashed" },
        },
      ],
    };
  }, [points]);

  const ec = useMemo(() => ({
    onInit(canvas, width, height, dpr) {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      canvas.setChart(chart);
      chart.setOption(option);
      chartRef.current = chart;
      return chart;
    },
  }), [option]);

  useEffect(() => {
    if (chartRef.current) chartRef.current.setOption(option, true);
  }, [option]);

  return (
    <View className="behavior-norm-chart">
      <ec-canvas
        id="behavior-norm-comparison"
        canvasId="behavior-norm-comparison"
        ec={ec}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default BehaviorNormComparisonChart;
