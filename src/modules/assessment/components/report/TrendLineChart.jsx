import useNativeEChart from "./useNativeEChart";
import React, { useMemo } from "react";
import { View } from "@tarojs/components";
import { parseReportScore, formatReportScore } from "../../lib/reportTrend";

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

  const option = useMemo(() => {
    const values = (points || []).map((item) => parseReportScore(item[valueKey]));
    if (!values.some((value) => value !== null)) {
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
    const tooltipLabels = points.map((item) => item.fullLabel || item[labelKey]);

    return {
      animation: false,
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
          const label = tooltipLabels[point.dataIndex] || point.axisValue;
          return `${label}<br/>${point.seriesName}: ${formatReportScore(point.data)}`;
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
          smooth: false,
          connectNulls: false,
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

  const { ec, onInit } = useNativeEChart(option);

  return (
    <View className="trend-line-chart-wrapper" style={{ height }}>
      <ec-canvas
        id={`${chartId}-canvas`}
        canvasId={`${chartId}-canvas`}
        ec={ec}
        onInit={onInit}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default TrendLineChart;
