import React, { useMemo, useRef, useEffect } from 'react';
import { View } from '@tarojs/components';
import * as echarts from '../ec-canvas/echarts';
import { getRiskConfig } from '@/shared/lib/statusFormatters';

/**
 * Radar 图组件（基于 echarts-for-weixin）
 * data: [{ title, score, max_score, risk_level }]
 */
const RadarChart = ({ data = [] }) => {
  const chartRef = useRef(null);

  // 根据风险等级获取颜色配置
  const hexToRgba = (hex, alpha) => {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getRiskColor = (riskLevel) => {
    const base = getRiskConfig(riskLevel).bgColor;
    return {
      line: base,
      point: base,
      gradient: [hexToRgba(base, 0.25), hexToRgba(base, 0.08)],
    };
  };

  // 计算整体风险等级（取最高风险）
  const getOverallRiskLevel = () => {
    if (!data || data.length === 0) return 'normal';
    const riskPriority = { 'high': 3, 'medium': 2, 'low': 1, 'normal': 0 };
    let maxRisk = 'normal';
    let maxPriority = 0;
    data.forEach(item => {
      const priority = riskPriority[item.risk_level] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        maxRisk = item.risk_level || 'normal';
      }
    });
    return maxRisk;
  };

  // 构造图表配置
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        radar: {
          indicator: [{ name: '暂无数据', max: 1 }],
          splitNumber: 4,
          splitLine: {
            lineStyle: { 
              color: '#E8F0F8', 
              width: 1,
              type: 'dashed',
            },
          },
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(248, 250, 252, 0.6)', 'rgba(241, 245, 249, 0.4)', 'transparent', 'transparent'],
            },
          },
          axisLine: {
            lineStyle: { 
              color: '#D1E0F0', 
              width: 1,
            },
          },
          name: {
            textStyle: { 
              color: '#64748B', 
              fontSize: 12,
              fontWeight: 500,
            },
          },
        },
        series: [
          {
            type: 'radar',
            data: [{ value: [0], name: '暂无数据' }],
            areaStyle: { color: 'rgba(59, 130, 246, 0.15)' },
            lineStyle: { color: 'rgba(59, 130, 246, 1)', width: 2 },
            itemStyle: { color: 'rgba(59, 130, 246, 1)' },
          },
        ],
      };
    }

    const riskPriority = { high: 3, medium: 2, low: 1, normal: 0 };
    const ranked = data
      .map((item, index) => ({ ...item, index }))
      .sort((a, b) => {
        const pa = riskPriority[a.risk_level] ?? 0;
        const pb = riskPriority[b.risk_level] ?? 0;
        if (pb !== pa) return pb - pa;
        const aScore = Number(a.score) || 0;
        const bScore = Number(b.score) || 0;
        return bScore - aScore;
      });
    const visibleSet = new Set(ranked.slice(0, 6).map((item) => item.index));

    // 使用百分比绘制雷达图，所有因子的最大值统一为100
    const indicator = data.map((item, index) => ({
      name: visibleSet.has(index) ? (item.title || '') : '',
      max: 100,  // 统一使用100作为最大值，表示百分比
    }));

    // 计算每个因子的得分百分比
    const values = data.map((item) => {
      const score = Number(item.score) || 0;
      const maxScore = Number(item.max_score) || 1;
      if (maxScore <= 0) return 0;
      // 计算百分比，限制在0-100之间
      const percent = Math.min(Math.max((score / maxScore) * 100, 0), 100);
      return Math.round(percent * 10) / 10; // 保留一位小数
    });
    
    // 创建标签显示方式映射：记录哪些标签需要竖着显示
    // 雷达图中，左右两侧的标签（索引在总长度的25%-75%范围内）需要竖着显示
    const verticalLabelMap = new Map();
    const total = indicator.length;
    indicator.forEach((item, index) => {
      // 计算角度位置：每个标签的角度 = (360 / total) * index
      // 左右两侧：角度在 45°-135° 和 225°-315° 范围内
      const angle = (360 / total) * index;
      const normalizedAngle = angle % 360;
      // 判断是否在左右两侧（45°-135° 或 225°-315°）
      const isLeftOrRight = (normalizedAngle >= 45 && normalizedAngle <= 135) || 
                           (normalizedAngle >= 225 && normalizedAngle <= 315);
      verticalLabelMap.set(item.name, isLeftOrRight);
    });
    
    const overallRisk = getOverallRiskLevel();
    const colorConfig = getRiskColor(overallRisk);

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 8,
        padding: [8, 12],
        textStyle: {
          color: '#1E293B',
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
        formatter: (params) => {
          // 雷达图的 tooltip 会显示所有维度
          if (params.data && params.data.value) {
            let tooltipContent = '因子维度得分\n';
            const percentValues = params.data.value; // 这是百分比值
            data.forEach((item, index) => {
              if (index < percentValues.length) {
                const riskLabel = {
                  'high': '高风险',
                  'medium': '中风险',
                  'low': '低风险',
                  'normal': '正常',
                }[item?.risk_level] || '正常';
                // 显示原始得分和百分比
                const originalScore = Number(item.score) || 0;
                const maxScore = Number(item.max_score) || 1;
                const percent = percentValues[index] || 0;
                if (item?.title) {
                  tooltipContent += `${item.title}: ${originalScore}/${maxScore} ${percent.toFixed(0)}% ${riskLabel}\n`;
                }
              }
            });
            return tooltipContent;
          }
          return params.name || '暂无数据';
        },
      },
      radar: {
        indicator,
        splitNumber: 3,  // 减少分割数，避免网格线太密集
        center: ['50%', '52%'],  // 稍微上移，给底部标签更多空间
        radius: '78%',  // 增大半径，让图表更宽松
        splitLine: {
          show: true,
          lineStyle: { 
            color: '#E8F0F8',      // 柔和的浅蓝色
            width: 1,
            type: 'dashed',        // 虚线更柔和
          },
        },
        // 柔和的网格区域（避免整片灰黑色）
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(248, 250, 252, 0.5)',   // 最外层：极浅的蓝灰色（降低透明度）
              'rgba(241, 245, 249, 0.3)',   // 第二层：浅蓝灰色（降低透明度）
              'rgba(236, 242, 250, 0.15)',  // 第三层：更浅（降低透明度）
              'transparent',                 // 最内层：透明
            ],
          },
        },
        // 坐标轴线（更柔和）
        axisLine: {
          show: true,
          lineStyle: { 
            color: '#D1E0F0',      // 柔和的蓝色
            width: 1.5,
          },
        },
        // 刻度标签（显示百分比）- 只在关键位置显示
        axisLabel: {
          show: false,
        },
        name: {
          textStyle: { 
            color: '#475569',       // 柔和的深灰色
            fontSize: 11,  // 稍微减小字体
            fontWeight: 500,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          },
          formatter: (name) => {
            if (!name) return '';
            // 根据映射判断是否需要竖着显示
            const needVertical = verticalLabelMap.get(name);
            
            if (needVertical) {
              // 左右两侧：竖着显示（每个字符一行）
              const chars = name.split('');
              // 限制最大长度，避免太长
              const maxLength = 4;
              const displayChars = chars.length > maxLength 
                ? chars.slice(0, maxLength).concat('...') 
                : chars;
              return displayChars.join('\n');
            } else {
              // 上下两侧：横着显示
              return name.length > 5 ? name.substring(0, 5) + '...' : name;
            }
          },
          // 增加标签与雷达图的距离
          distance: 10,
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '因子得分',
              areaStyle: { 
                color: {
                  type: 'radial',
                  x: 0.5,
                  y: 0.5,
                  r: 0.8,
                  colorStops: [
                    { offset: 0, color: colorConfig.gradient[0] },
                    { offset: 1, color: colorConfig.gradient[1] },
                  ],
                },
              },
              // 线条样式
              lineStyle: { 
                color: colorConfig.line, 
                width: 2.5,
                type: 'solid',
              },
              itemStyle: {
                color: colorConfig.point,
                borderColor: '#FFFFFF',
                borderWidth: 2,
                shadowBlur: 4,
                shadowColor: 'rgba(0, 0, 0, 0.1)',
              },
              // 数据点大小
              symbolSize: 8,
              // 标签样式
              label: {
                show: false,
              },
            },
          ],
        },
      ],
    };
  }, [data]);

  // echarts 初始化配置
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

  // 数据变化时更新图表
  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return (
    <View className="radar-chart-wrapper">
      <ec-canvas
        id="radar"
        canvasId="radar"
        ec={ec}
        style="width: 100%; height: 100%;"
      />
    </View>
  );
};

export default RadarChart;
