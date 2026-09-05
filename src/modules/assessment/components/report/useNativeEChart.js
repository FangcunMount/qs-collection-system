import { useCallback, useEffect, useRef } from "react";
import * as echarts from "@/pages/assessment/components/ec-canvas/echarts";

// Only serializable data can cross native component properties. Initialization
// travels through the native init event, which carries the canvas in detail.
const EC_CONFIG = {};

export default function useNativeEChart(option) {
  const chartRef = useRef(null);
  const optionRef = useRef(option);
  const mountedRef = useRef(true);
  optionRef.current = option;

  const onInit = useCallback(({ detail }) => {
    if (!mountedRef.current) return;
    const { canvas, width, height, dpr, canvasDpr } = detail;
    chartRef.current?.dispose();
    const chart = echarts.init(canvas, null, {
      width, height, devicePixelRatio: dpr ?? canvasDpr ?? 1,
    });
    chartRef.current = chart;
    canvas.setChart(chart);
    chart.setOption(optionRef.current);
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return { ec: EC_CONFIG, onInit };
}
