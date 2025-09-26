import React from "react";
import { View, Text } from "@tarojs/components";

import BaseAnalysisShowCard from "./baseAnalysisShowCard";

const FactorAnalysisShowCard = ({ total, title, content, score }) => {
  return (
    <BaseAnalysisShowCard title={title} content={content}>
      <View
        className='s-mt-sm s-mb-sm s-row'
        style={{
          alignItems: "center",
          fontSize: "24rpx"
        }}
      >
        <View
          style={{
            height: "30rpx",
            width: "300rpx",
            borderRadius: "100rpx",
            border: "1rpx solid #aaa",
            position: "relative"
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "100rpx",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* 分值进度 */}
            <View
              style={{
                height: "100%",
                width: `${300 * (score / total)}rpx`,
                backgroundColor: "#478de2",
                borderRadius: "100rpx",
                overflow: "hidden"
              }}
            ></View>
          </View>
        </View>
        <Text className='s-ml-sm s-mr-xs'>{`${score}/${total}`}</Text>
      </View>
    </BaseAnalysisShowCard>
  );
};

export default FactorAnalysisShowCard;
