import React, { useMemo, useRef, useEffect } from 'react';
import { View } from '@tarojs/components';
import * as echarts from '@/pages/assessment/components/ec-canvas/echarts';
import { getRiskConfig } from '@/shared/lib/statusFormatters';

/**
 * 因子阈值散点图（基于 echarts-for-weixin）
 * data: [{ title, score, max_score, risk_level }]
 */
const FactorScatterChart = ({ data = [] }) => {
  const chartRef = useRef(null);

  const riskLabelMap = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
    normal: '正常',
  };

  const getRiskColor = (riskLevel) => {
    const config = getRiskConfig(riskLevel);
    return config.bgColor;
  };

  const processed = useMemo(() => {
    const normalized = (data || []).map((item) => {
      const score = Number(item.score) || 0;
      const maxScore = Number(item.max_score);
      const hasMax = maxScore > 0;
      const percent = hasMax ? Math.min((score / maxScore) * 100, 100) : null;
      return {
        ...item,
        score,
        maxScore: hasMax ? maxScore : null,
        percent,
        risk_level: item.risk_level || 'normal',
      };
    });

    const usePercent = normalized.some((item) => item.maxScore);
    const fallbackMax = Math.max(1, ...normalized.map((item) => item.score || 0));
    const axisMax = usePercent ? 100 : fallbackMax;

    return { normalized, usePercent, axisMax };
  }, [data]);

  const chartHeight = useMemo(() => {
    const rowHeight = 64;
    const minHeight = 360;
    return Math.max(minHeight, processed.normalized.length * rowHeight);
  }, [processed.normalized.length]);

  const option = useMemo(() => {
    if (!processed.normalized.length) {
      return {
        grid: { left: 24, right: 24, top: 24, bottom: 24, containLabel: true },
        xAxis: { type: 'value', max: 100, show: false },
        yAxis: {
          type: 'category',
          data: ['暂无数据'],
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#9CA3AF' },
        },
        series: [
          {
            type: 'scatter',
            data: [[0, 0]],
            itemStyle: { color: '#E5E7EB' },
          },
        ],
      };
    }

    const { normalized, usePercent, axisMax } = processed;
    const yLabels = normalized.map((item) => item.title || '');

    const dataPoints = normalized.map((item, index) => ({
      value: [usePercent ? item.percent ?? 0 : item.score, index],
      itemStyle: { color: getRiskColor(item.risk_level) },
      symbolSize: usePercent ? (item.percent ?? 0) * 0.25 + 10 : item.score * 0.1 + 10,
    }));

    const thresholdLines = usePercent
      ? [
          { xAxis: 60, lineStyle: { color: '#F59E0B', type: 'dashed' } },
          { xAxis: 80, lineStyle: { color: '#EF4444', type: 'dashed' } },
        ]
      : [];

    return {
      grid: { left: 24, right: 40, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 8,
        padding: [10, 14],
        textStyle: {
          color: '#1E293B',
          fontSize: 12,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
        formatter: (params) => {
          const item = normalized[params.dataIndex];
          if (!item) return '';
          const riskLabel = riskLabelMap[item.risk_level] || '正常';
          const scoreText = item.maxScore
            ? `${item.score} / ${item.maxScore} (${(item.percent ?? 0).toFixed(1)}%)`
            : `${item.score}`;
          return `${item.title || ''}\n得分：${scoreText}\n风险：${riskLabel}`;
        },
      },
      xAxis: {
        type: 'value',
        max: axisMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#9CA3AF',
          formatter: (value) => (usePercent ? `${value}%` : value),
        },
        splitLine: {
          lineStyle: { color: '#F1F5F9', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 12,
          formatter: (value) => {
            if (!value) return '';
            return value.length > 8 ? `${value.substring(0, 8)}...` : value;
          },
        },
      },
      series: [
        {
          type: 'scatter',
          data: dataPoints,
          markLine: thresholdLines.length
            ? {
                symbol: 'none',
                data: thresholdLines,
                label: { show: false },
              }
            : undefined,
        },
      ],
    };
  }, [processed]);

  const ec = useMemo(
    () => ({
      onInit(canvas, width, height, dpr) {
        const chart = echarts.init(canvas, null, {
          width,
          height,
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
    <View className="scatter-chart-wrapper" style={`height: ${chartHeight}rpx;`}>
      <ec-canvas
        id="factor-scatter"
        canvasId="factor-scatter"
        ec={ec}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default FactorScatterChart;
