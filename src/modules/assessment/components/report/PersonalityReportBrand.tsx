import React from "react";
import { Text, View } from "@tarojs/components";
import "./PersonalityReportBrand.less";

export default function PersonalityReportBrand() {
  return <View className="personality-report-brand">
    <Text className="personality-report-brand__name">Qlume</Text>
    <Text className="personality-report-brand__domain">· 人格探索</Text>
  </View>;
}
