import React, { useEffect, useMemo, useRef } from "react";
import { View } from "@tarojs/components";
import * as echarts from "../../../components/ec-canvas/echarts";

const TrendLineChart = ({
  chartId = "trend-line",
  points = [],
  emptyText = "暂无趋势数据",
  valueKey = "value",
  labelKey = "label",
  lineColor = "#3B82F6",
  areaColor = "rgba(59, 130, 246, 0.12)",
  height = "320rpx",
}) => {
  const chartRef = useRef(null);

  const option = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        title: {
          text: emptyText,
          left: "center",
          top: "center",
          textStyle: {
            color: "#94A3B8",
            fontSize: 12,
            fontWeight: 400,
          },
        },
        xAxis: { show: false, type: "category" },
        yAxis: { show: false, type: "value" },
        series: [],
      };
    }

    const categories = points.map((item) => item[labelKey]);
    const values = points.map((item) => Number(item[valueKey] || 0));

    return {
      grid: {
        left: 18,
        right: 18,
        top: 24,
        bottom: 28,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderColor: "#E2E8F0",
        borderWidth: 1,
        textStyle: {
          color: "#1F2937",
          fontSize: 12,
        },
        formatter: (params = []) => {
          const point = params[0];
          if (!point) return "";
          return `${point.axisValue}<br/>${point.seriesName}: ${point.data}`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: categories,
        axisLine: {
          lineStyle: { color: "#CBD5E1" },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: "#64748B",
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: "#E2E8F0",
            type: "dashed",
          },
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: "#64748B",
          fontSize: 10,
        },
      },
      series: [
        {
          name: "分数",
          type: "line",
          smooth: true,
          data: values,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            color: lineColor,
            width: 3,
          },
          itemStyle: {
            color: lineColor,
            borderColor: "#FFFFFF",
            borderWidth: 2,
          },
          areaStyle: {
            color: areaColor,
          },
        },
      ],
    };
  }, [areaColor, emptyText, labelKey, lineColor, points, valueKey]);

  const ec = useMemo(
    () => ({
      onInit(canvas, width, heightValue, dpr) {
        const chart = echarts.init(canvas, null, {
          width,
          height: heightValue,
          devicePixelRatio: dpr,
        });
        canvas.setChart(chart);
        chart.setOption(option);
        chartRef.current = chart;
        return chart;
      },
    }),
    [option],
  );

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return (
    <View className="trend-line-chart-wrapper" style={{ height }}>
      <ec-canvas
        id={`${chartId}-canvas`}
        canvasId={`${chartId}-canvas`}
        ec={ec}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default TrendLineChart;
