import React, { useMemo, useRef, useEffect } from 'react';
import { View } from '@tarojs/components';
import * as echarts from '@/pages/assessment/components/ec-canvas/echarts';
import { getRiskConfig } from '@/shared/lib/statusFormatters';

/**
 * 因子横向条形图（基于 echarts-for-weixin）
 * data: [{ title, score, max_score, risk_level }]
 */
const FactorBarChart = ({ data = [] }) => {
  const chartRef = useRef(null);

  const riskPriority = {
    high: 3,
    medium: 2,
    low: 1,
    normal: 0,
  };

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
    const sorted = normalized.sort((a, b) => {
      const pa = riskPriority[a.risk_level] ?? 0;
      const pb = riskPriority[b.risk_level] ?? 0;
      if (pb !== pa) return pb - pa;
      const va = usePercent ? (a.percent ?? 0) : a.score;
      const vb = usePercent ? (b.percent ?? 0) : b.score;
      return vb - va;
    });

    return { sorted, usePercent };
  }, [data]);

  const chartHeight = useMemo(() => {
    const rowHeight = 70;
    const minHeight = 420;
    return Math.max(minHeight, processed.sorted.length * rowHeight);
  }, [processed.sorted.length]);

  const option = useMemo(() => {
    if (!processed.sorted.length) {
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
            type: 'bar',
            data: [0],
            barWidth: 12,
            itemStyle: { color: '#E5E7EB' },
          },
        ],
      };
    }

    const { sorted, usePercent } = processed;
    const valueMax = usePercent
      ? 100
      : Math.max(1, ...sorted.map((item) => Number(item.score) || 0));

    return {
      grid: { left: 24, right: 40, top: 16, bottom: 16, containLabel: true },
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
          const item = sorted[params.dataIndex];
          if (!item) return '';
          const riskLabel = riskLabelMap[item.risk_level] || '正常';
          const scoreText = item.maxScore
            ? `${item.score} / ${item.maxScore} (${item.percent.toFixed(1)}%)`
            : `${item.score}`;
          return `${item.title || ''}\n得分：${scoreText}\n风险：${riskLabel}`;
        },
      },
      xAxis: {
        type: 'value',
        max: valueMax,
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
        data: sorted.map((item) => item.title || ''),
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
          type: 'bar',
          data: sorted.map((item) => ({
            value: usePercent ? (item.percent ?? 0) : item.score,
            itemStyle: { color: getRiskColor(item.risk_level) },
          })),
          barWidth: 14,
          showBackground: true,
          backgroundStyle: { color: '#F8FAFC' },
          label: {
            show: true,
            position: 'right',
            color: '#1F2937',
            fontSize: 11,
            formatter: (params) => {
              const item = sorted[params.dataIndex];
              if (!item) return '';
              if (item.maxScore) return `${item.score}/${item.maxScore}`;
              return `${item.score}`;
            },
          },
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
    <View className="bar-chart-wrapper" style={`height: ${chartHeight}rpx;`}>
      <ec-canvas
        id="factor-bar"
        canvasId="factor-bar"
        ec={ec}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default FactorBarChart;
